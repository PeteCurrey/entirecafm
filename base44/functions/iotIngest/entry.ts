import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

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
    
    // IoT endpoints might use API key auth, so we handle both user and service role
    let orgId;
    try {
      const user = await base44.auth.me();
      orgId = user.org_id || 'default-org';
    } catch {
      // If user auth fails, this might be an IoT device using service role
      orgId = 'default-org';
    }

    const body = await req.json();
    const { asset_id, type, value, timestamp, telemetry } = body;

    // Handle both single and batch telemetry
    const telemetryData = telemetry || [{ asset_id, type, value, timestamp }];

    console.log(`📡 IoT Ingestion: ${telemetryData.length} data points`);

    const processedAssets = new Set();

    for (const data of telemetryData) {
      if (!data.asset_id || !data.type || data.value === undefined) {
        console.warn('⚠️ Invalid telemetry data:', data);
        continue;
      }

      // Fetch asset to get org_id
      const assets = await base44.asServiceRole.entities.Asset.filter({ 
        id: data.asset_id 
      });

      if (assets.length === 0) {
        console.warn(`⚠️ Asset not found: ${data.asset_id}`);
        continue;
      }

      const asset = assets[0];
      const assetOrgId = asset.org_id || orgId;

      // Calculate sensor health score from telemetry
      // Score based on value ranges and type
      let sensorHealthScore = 0.8; // Default good health

      switch (data.type) {
        case 'temperature':
          // Optimal: 18-24°C, Warning: <15 or >28, Critical: <10 or >35
          if (data.value >= 18 && data.value <= 24) sensorHealthScore = 1.0;
          else if (data.value >= 15 && data.value <= 28) sensorHealthScore = 0.7;
          else if (data.value >= 10 && data.value <= 35) sensorHealthScore = 0.4;
          else sensorHealthScore = 0.2;
          break;

        case 'vibration':
          // Lower is better for vibration (mm/s)
          if (data.value < 2.8) sensorHealthScore = 1.0;
          else if (data.value < 7.1) sensorHealthScore = 0.7;
          else if (data.value < 18) sensorHealthScore = 0.4;
          else sensorHealthScore = 0.2;
          break;

        case 'pressure':
          // Optimal range depends on asset type, use normalized score
          if (data.value >= 90 && data.value <= 110) sensorHealthScore = 1.0;
          else if (data.value >= 80 && data.value <= 120) sensorHealthScore = 0.7;
          else sensorHealthScore = 0.4;
          break;

        case 'power':
          // Power consumption relative to baseline
          if (data.value >= 0.9 && data.value <= 1.1) sensorHealthScore = 1.0;
          else if (data.value >= 0.8 && data.value <= 1.3) sensorHealthScore = 0.7;
          else sensorHealthScore = 0.4;
          break;

        default:
          // Generic normalized score (0-100 range assumed)
          sensorHealthScore = Math.min(Math.max(data.value / 100, 0), 1);
      }

      // Update or create AssetFeatures record
      const existingFeatures = await base44.asServiceRole.entities.AssetFeatures.filter({
        asset_id: data.asset_id
      });

      if (existingFeatures.length > 0) {
        await base44.asServiceRole.entities.AssetFeatures.update(
          existingFeatures[0].id,
          {
            sensor_health_score: sensorHealthScore,
            computed_at: new Date().toISOString()
          }
        );
      } else {
        await base44.asServiceRole.entities.AssetFeatures.create({
          org_id: assetOrgId,
          asset_id: data.asset_id,
          site_id: asset.site_id,
          asset_type: asset.asset_type,
          sensor_health_score: sensorHealthScore,
          computed_at: new Date().toISOString()
        });
      }

      processedAssets.add(data.asset_id);

      console.log(`✅ Updated sensor health for asset ${data.asset_id}: ${sensorHealthScore.toFixed(2)}`);
    }

    // Trigger PAFE prediction for all affected assets
    for (const assetId of processedAssets) {
      try {
        await base44.asServiceRole.functions.invoke('pafe_predictFailure', {
          asset_id: assetId
        });
        console.log(`🔮 Triggered PAFE prediction for asset ${assetId}`);
      } catch (error) {
        console.error(`Failed to trigger PAFE for ${assetId}:`, error);
      }
    }

    // Publish real-time updates
    await publishToRedis(`iot.org.${orgId}`, {
      type: 'telemetry_received',
      assets_updated: Array.from(processedAssets),
      data_points: telemetryData.length,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      data_points_processed: telemetryData.length,
      assets_updated: processedAssets.size,
      pafe_triggered: processedAssets.size
    });

  } catch (error) {
    console.error('IoT Ingestion error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});