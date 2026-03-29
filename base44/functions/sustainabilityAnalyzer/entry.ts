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
    const { org_id } = body;

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    const [complianceRecords, esgMetrics, sites] = await Promise.all([
      base44.asServiceRole.entities.ComplianceRecord.filter({ org_id }),
      base44.asServiceRole.entities.ESGMetric.filter({ org_id }),
      base44.asServiceRole.entities.Site.filter({ org_id })
    ]);

    const scores = [];

    // Calculate org-level score
    const recentMetrics = esgMetrics.filter(m => 
      new Date(m.recorded_at) >= ninetyDaysAgo
    );

    // Compliance rate
    const totalTests = complianceRecords.length;
    const overdueTests = complianceRecords.filter(r => 
      new Date(r.next_due_date) < now
    ).length;
    const complianceRate = totalTests > 0 
      ? ((totalTests - overdueTests) / totalTests) * 100 
      : 100;

    // Carbon intensity (kg CO2 per kWh)
    const energyMetrics = recentMetrics.filter(m => m.metric_type === 'energy_kwh');
    const co2Metrics = recentMetrics.filter(m => m.metric_type === 'co2_tonnes');
    const totalEnergy = energyMetrics.reduce((sum, m) => sum + m.value, 0);
    const totalCO2 = co2Metrics.reduce((sum, m) => sum + m.value, 0) * 1000; // tonnes to kg
    const carbonIntensity = totalEnergy > 0 ? totalCO2 / totalEnergy : 0;

    // Waste diversion (assuming recycling vs landfill)
    const wasteMetrics = recentMetrics.filter(m => m.metric_type === 'waste_kg');
    const totalWaste = wasteMetrics.reduce((sum, m) => sum + m.value, 0);
    // Simple assumption: 40% diverted if no specific data
    const wasteDiversionPct = totalWaste > 0 ? 40 : 0;

    // ESG Score calculation
    // score = 0.5*(compliance_rate_pct) + 0.3*(100 - carbon_intensity_index) + 0.2*(waste_diversion_pct)
    const carbonIntensityIndex = Math.min(100, carbonIntensity * 10); // normalize
    const esgScore = 
      (0.5 * complianceRate) + 
      (0.3 * (100 - carbonIntensityIndex)) + 
      (0.2 * wasteDiversionPct);

    // Rating
    let rating = 'POOR';
    if (esgScore >= 85) rating = 'EXCELLENT';
    else if (esgScore >= 70) rating = 'GOOD';
    else if (esgScore >= 55) rating = 'FAIR';

    // Org-level score
    const existingOrgScore = (await base44.asServiceRole.entities.SustainabilityScore.filter({
      org_id,
      site_id: null
    }))[0];

    const orgScoreData = {
      org_id,
      site_id: null,
      compliance_rate_pct: Math.round(complianceRate * 10) / 10,
      carbon_intensity: Math.round(carbonIntensity * 100) / 100,
      waste_diversion_pct: Math.round(wasteDiversionPct * 10) / 10,
      overall_esg_score: Math.round(esgScore * 10) / 10,
      rating,
      computed_at: now.toISOString()
    };

    if (existingOrgScore) {
      await base44.asServiceRole.entities.SustainabilityScore.update(existingOrgScore.id, orgScoreData);
    } else {
      await base44.asServiceRole.entities.SustainabilityScore.create(orgScoreData);
    }

    scores.push(orgScoreData);

    // Site-level scores
    for (const site of sites) {
      const siteMetrics = recentMetrics.filter(m => m.site_id === site.id);
      const siteRecords = complianceRecords.filter(r => r.site_id === site.id);

      const siteComplianceRate = siteRecords.length > 0
        ? ((siteRecords.length - siteRecords.filter(r => new Date(r.next_due_date) < now).length) / siteRecords.length) * 100
        : 100;

      const siteEnergy = siteMetrics.filter(m => m.metric_type === 'energy_kwh').reduce((s, m) => s + m.value, 0);
      const siteCO2 = siteMetrics.filter(m => m.metric_type === 'co2_tonnes').reduce((s, m) => s + m.value, 0) * 1000;
      const siteCarbonIntensity = siteEnergy > 0 ? siteCO2 / siteEnergy : 0;

      const siteWasteDiversionPct = 40; // Default

      const siteCarbonIndex = Math.min(100, siteCarbonIntensity * 10);
      const siteESGScore = 
        (0.5 * siteComplianceRate) + 
        (0.3 * (100 - siteCarbonIndex)) + 
        (0.2 * siteWasteDiversionPct);

      let siteRating = 'POOR';
      if (siteESGScore >= 85) siteRating = 'EXCELLENT';
      else if (siteESGScore >= 70) siteRating = 'GOOD';
      else if (siteESGScore >= 55) siteRating = 'FAIR';

      const existingSiteScore = (await base44.asServiceRole.entities.SustainabilityScore.filter({
        org_id,
        site_id: site.id
      }))[0];

      const siteScoreData = {
        org_id,
        site_id: site.id,
        compliance_rate_pct: Math.round(siteComplianceRate * 10) / 10,
        carbon_intensity: Math.round(siteCarbonIntensity * 100) / 100,
        waste_diversion_pct: siteWasteDiversionPct,
        overall_esg_score: Math.round(siteESGScore * 10) / 10,
        rating: siteRating,
        computed_at: now.toISOString()
      };

      if (existingSiteScore) {
        await base44.asServiceRole.entities.SustainabilityScore.update(existingSiteScore.id, siteScoreData);
      } else {
        await base44.asServiceRole.entities.SustainabilityScore.create(siteScoreData);
      }

      scores.push(siteScoreData);
    }

    // Publish to Redis
    await publishToRedis(`sustainability.org.${org_id}`, {
      type: 'esg_update',
      overall_score: esgScore,
      rating,
      compliance_rate: complianceRate,
      timestamp: now.toISOString()
    });

    return Response.json({
      success: true,
      scores_computed: scores.length,
      org_score: esgScore,
      org_rating: rating
    });

  } catch (error) {
    console.error('Sustainability analyzer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});