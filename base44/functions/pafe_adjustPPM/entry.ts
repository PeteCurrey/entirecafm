import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

async function publishToRedis(channel, message) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/publish/${channel}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` },
      body: JSON.stringify(message)
    });
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { org_id, auto_adjust = false } = body;

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    const [scores, assets, ppmSchedules] = await Promise.all([
      base44.asServiceRole.entities.AssetFailureScore.filter({ org_id }),
      base44.asServiceRole.entities.Asset.filter({ org_id }),
      base44.asServiceRole.entities.PPMSchedule.filter({ org_id })
    ]);

    const results = {
      jobs_created: 0,
      schedules_adjusted: 0,
      high_risk_processed: 0
    };

    for (const score of scores) {
      const asset = assets.find(a => a.id === score.asset_id);
      if (!asset) continue;

      if (score.risk_band === 'HIGH' && auto_adjust) {
        // Create proactive PPM override job
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + score.next_ppm_recommendation_days);

        const job = await base44.asServiceRole.entities.Job.create({
          org_id,
          job_number: `PAFE-${Date.now()}-${score.asset_id.slice(0, 6)}`,
          title: `PAFE: Proactive PPM - ${asset.name}`,
          description: `Automated proactive maintenance due to high failure risk (score: ${score.risk_score.toFixed(2)})`,
          job_type: 'ppm',
          priority: 'high',
          status: 'new',
          client_id: asset.org_id, // Assuming org acts as client
          site_id: asset.site_id,
          asset_id: asset.id,
          scheduled_date: dueDate.toISOString().split('T')[0],
          notes: [{
            text: `PAFE generated: Risk ${score.risk_score.toFixed(2)}, RUL ${score.rul_days}d. Drivers: ${score.top_drivers.join(', ')}`,
            created_by: 'PAFE',
            created_at: new Date().toISOString()
          }]
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
          org_id,
          user_id: 'PAFE',
          action: 'CREATE',
          entity_type: 'Job',
          entity_id: job.id,
          new_values: {
            asset_id: asset.id,
            risk_score: score.risk_score,
            trigger: 'high_risk_pafe'
          },
          timestamp: new Date().toISOString()
        });

        results.jobs_created++;
        results.high_risk_processed++;
      }

      // Adjust PPM schedules
      const ppmSchedule = ppmSchedules.find(p => p.asset_id === asset.id);
      if (ppmSchedule) {
        let newInterval = ppmSchedule.interval_days;

        if (score.risk_band === 'MED') {
          // Reduce by 15%
          newInterval = Math.max(30, Math.floor(ppmSchedule.interval_days * 0.85));
        } else if (score.risk_band === 'LOW') {
          // Extend by 10%
          newInterval = Math.floor(ppmSchedule.interval_days * 1.1);
        }

        if (newInterval !== ppmSchedule.interval_days) {
          await base44.asServiceRole.entities.PPMSchedule.update(ppmSchedule.id, {
            interval_days: newInterval
          });
          results.schedules_adjusted++;
        }
      }
    }

    // Publish updates
    await publishToRedis(`director.org.${org_id}`, {
      type: 'pafe_adjustments',
      jobs_created: results.jobs_created,
      high_risk_count: results.high_risk_processed,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('PAFE adjust PPM error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});