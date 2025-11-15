import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { org_id } = body;

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    const [assets, jobs, ppmSchedules] = await Promise.all([
      base44.asServiceRole.entities.Asset.filter({ org_id }),
      base44.asServiceRole.entities.Job.filter({ org_id }),
      base44.asServiceRole.entities.PPMSchedule.filter({ org_id })
    ]);

    const computed = [];

    for (const asset of assets) {
      const assetJobs = jobs.filter(j => j.asset_id === asset.id);
      
      // Jobs last 90d
      const jobsLast90d = assetJobs.filter(j => 
        j.created_date && new Date(j.created_date) >= ninetyDaysAgo
      ).length;

      // Failures last 12m (reactive jobs)
      const failuresLast12m = assetJobs.filter(j =>
        j.job_type === 'reactive' &&
        j.created_date && 
        new Date(j.created_date) >= twelveMonthsAgo
      ).length;

      // Mean Time Between Failures
      const failureDates = assetJobs
        .filter(j => j.job_type === 'reactive' && j.created_date)
        .map(j => new Date(j.created_date).getTime())
        .sort((a, b) => a - b);
      
      let mtbf = 0;
      if (failureDates.length > 1) {
        const intervals = [];
        for (let i = 1; i < failureDates.length; i++) {
          intervals.push((failureDates[i] - failureDates[i-1]) / (1000 * 60 * 60 * 24));
        }
        mtbf = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      } else if (failureDates.length === 1 && asset.installation_date) {
        mtbf = (now.getTime() - new Date(asset.installation_date).getTime()) / (1000 * 60 * 60 * 24);
      }

      // Average job duration and cost
      const completedJobs = assetJobs.filter(j => j.time_on_site_minutes);
      const avgJobDuration = completedJobs.length > 0
        ? completedJobs.reduce((sum, j) => sum + j.time_on_site_minutes, 0) / completedJobs.length
        : 0;

      // Calculate cost from parts_used
      const totalCost = assetJobs.reduce((sum, j) => {
        if (!j.parts_used) return sum;
        return sum + j.parts_used.reduce((s, p) => s + (p.cost || 0) * (p.quantity || 1), 0);
      }, 0);
      const avgJobCost = assetJobs.length > 0 ? totalCost / assetJobs.length : 0;

      // Downtime hours (sum of time_on_site for all jobs)
      const downtimeHours = completedJobs.reduce(
        (sum, j) => sum + (j.time_on_site_minutes || 0), 0
      ) / 60;

      // Age in days
      const installDate = asset.installation_date || asset.created_date;
      const ageDays = installDate 
        ? Math.floor((now.getTime() - new Date(installDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // PPM info
      const ppmSchedule = ppmSchedules.find(p => p.asset_id === asset.id);
      const lastPPMJob = assetJobs
        .filter(j => j.job_type === 'ppm' && j.completed_date)
        .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))[0];

      // Upsert features
      const existingFeature = (await base44.asServiceRole.entities.AssetFeatures.filter({
        asset_id: asset.id
      }))[0];

      const featureData = {
        org_id,
        asset_id: asset.id,
        site_id: asset.site_id,
        asset_type: asset.asset_type,
        manufacturer: asset.manufacturer,
        model: asset.model,
        install_date: installDate,
        age_days: ageDays,
        last_ppm_date: lastPPMJob?.completed_date,
        ppm_interval_days: ppmSchedule?.interval_days || asset.service_interval_days,
        jobs_last_90d: jobsLast90d,
        failures_last_12m: failuresLast12m,
        mean_time_between_failures_days: Math.round(mtbf),
        avg_job_duration_mins: Math.round(avgJobDuration),
        avg_job_cost: Math.round(avgJobCost),
        downtime_hours_12m: Math.round(downtimeHours * 10) / 10,
        sensor_health_score: null, // TODO: integrate sensor data
        computed_at: now.toISOString()
      };

      if (existingFeature) {
        await base44.asServiceRole.entities.AssetFeatures.update(existingFeature.id, featureData);
      } else {
        await base44.asServiceRole.entities.AssetFeatures.create(featureData);
      }

      computed.push({ asset_id: asset.id, features: featureData });
    }

    return Response.json({
      success: true,
      computed: computed.length,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('PAFE compute features error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});