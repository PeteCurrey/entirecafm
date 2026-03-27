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

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { org_id } = body;

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    const features = await base44.asServiceRole.entities.AssetFeatures.filter({ org_id });
    const predicted = [];

    for (const feat of features) {
      // Build risk score using hybrid logistic model
      let logit = 0.8;
      const drivers = [];

      // Failures last 12 months
      if (feat.failures_last_12m > 1) {
        logit += 0.7;
        drivers.push(`${feat.failures_last_12m} failures (12m)`);
      }

      // MTBF factor
      const mtbfFactor = 1 / (feat.mean_time_between_failures_days + 1);
      logit += 0.5 * mtbfFactor;
      if (mtbfFactor > 0.01) {
        drivers.push(`MTBF: ${feat.mean_time_between_failures_days}d`);
      }

      // Recent job frequency
      const jobFreqFactor = feat.jobs_last_90d / 5;
      logit += 0.4 * jobFreqFactor;
      if (feat.jobs_last_90d > 3) {
        drivers.push(`${feat.jobs_last_90d} jobs (90d)`);
      }

      // Average job duration
      const durationFactor = feat.avg_job_duration_mins / 60;
      logit += 0.3 * durationFactor;
      if (feat.avg_job_duration_mins > 90) {
        drivers.push(`Avg duration: ${Math.round(feat.avg_job_duration_mins)}min`);
      }

      // Average job cost
      const costFactor = feat.avg_job_cost / 500;
      logit += 0.2 * costFactor;
      if (feat.avg_job_cost > 300) {
        drivers.push(`Avg cost: £${Math.round(feat.avg_job_cost)}`);
      }

      // Sensor health (reduces risk if good)
      if (feat.sensor_health_score !== null) {
        logit -= 0.3 * feat.sensor_health_score;
        if (feat.sensor_health_score < 0.5) {
          drivers.push('Poor sensor health');
        }
      }

      // Age factor (10 year scale)
      const ageFactor = feat.age_days / 3650;
      logit += 0.2 * ageFactor;
      if (feat.age_days > 2555) { // >7 years
        drivers.push(`Age: ${Math.round(feat.age_days / 365)}y`);
      }

      // Calculate final risk score
      const riskScore = sigmoid(logit);

      // Determine risk band
      let riskBand = 'LOW';
      if (riskScore >= 0.7) riskBand = 'HIGH';
      else if (riskScore >= 0.45) riskBand = 'MED';

      // Estimate RUL (Remaining Useful Life)
      const mtbf = feat.mean_time_between_failures_days || 180;
      let rulDays = Math.round((mtbf * 0.6) * (1 - riskScore) * 3);
      rulDays = clamp(rulDays, 7, 540);

      // PPM recommendation
      const ppmInterval = feat.ppm_interval_days || 90;
      const nextPPMRec = Math.min(
        ppmInterval,
        Math.max(14, Math.floor(rulDays / 2))
      );

      // Review date
      const reviewBy = new Date();
      reviewBy.setDate(reviewBy.getDate() + nextPPMRec);

      // Upsert failure score
      const existingScore = (await base44.asServiceRole.entities.AssetFailureScore.filter({
        asset_id: feat.asset_id
      }))[0];

      const scoreData = {
        org_id,
        asset_id: feat.asset_id,
        risk_score: Math.round(riskScore * 1000) / 1000,
        risk_band: riskBand,
        rul_days: rulDays,
        top_drivers: drivers.slice(0, 5),
        next_ppm_recommendation_days: nextPPMRec,
        review_by: reviewBy.toISOString().split('T')[0],
        model_version: 'v1.0-rules',
        computed_at: new Date().toISOString()
      };

      if (existingScore) {
        await base44.asServiceRole.entities.AssetFailureScore.update(existingScore.id, scoreData);
      } else {
        await base44.asServiceRole.entities.AssetFailureScore.create(scoreData);
      }

      predicted.push({ 
        asset_id: feat.asset_id, 
        risk_score: scoreData.risk_score, 
        risk_band: riskBand 
      });
    }

    // Publish to Redis
    await publishToRedis(`pafe.org.${org_id}`, {
      type: 'predictions_updated',
      count: predicted.length,
      high_risk: predicted.filter(p => p.risk_band === 'HIGH').length,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      predicted: predicted.length,
      high_risk: predicted.filter(p => p.risk_band === 'HIGH').length,
      med_risk: predicted.filter(p => p.risk_band === 'MED').length,
      low_risk: predicted.filter(p => p.risk_band === 'LOW').length
    });

  } catch (error) {
    console.error('PAFE predict failure error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});