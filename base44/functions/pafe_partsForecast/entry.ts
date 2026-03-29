import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { org_id } = body;

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    const [scores, pricebook] = await Promise.all([
      base44.asServiceRole.entities.AssetFailureScore.filter({ org_id }),
      base44.asServiceRole.entities.PricebookItem.filter({ org_id })
    ]);

    // Map asset types to risk-weighted demand
    const assetTypeDemand = {};
    
    for (const score of scores) {
      const features = (await base44.asServiceRole.entities.AssetFeatures.filter({
        asset_id: score.asset_id
      }))[0];

      if (!features?.asset_type) continue;

      if (!assetTypeDemand[features.asset_type]) {
        assetTypeDemand[features.asset_type] = {
          total_risk: 0,
          count: 0
        };
      }

      assetTypeDemand[features.asset_type].total_risk += score.risk_score;
      assetTypeDemand[features.asset_type].count += 1;
    }

    const forecasts = [];

    // Map asset types to parts
    const assetTypeParts = {
      'hvac': ['FILTER-001', 'BELT-002', 'MOTOR-003'],
      'boiler': ['VALVE-001', 'PUMP-002', 'SENSOR-003'],
      'lift': ['CABLE-001', 'MOTOR-004', 'BRAKE-001'],
      'electrical': ['BREAKER-001', 'FUSE-002', 'CONTACTOR-001'],
      'plumbing': ['PIPE-001', 'VALVE-002', 'SEAL-001']
    };

    for (const [assetType, demand] of Object.entries(assetTypeDemand)) {
      const parts = assetTypeParts[assetType] || ['GENERIC-001'];
      const avgRisk = demand.total_risk / demand.count;
      
      for (const partSku of parts) {
        const pricebookItem = pricebook.find(p => 
          p.sku === partSku || p.name?.toLowerCase().includes(assetType)
        );

        // Expected usage: risk-weighted by asset count
        // High risk assets likely need parts sooner
        const expectedQty = Math.round(demand.count * avgRisk * 2.5);
        const confidence = Math.min(0.95, 0.4 + (avgRisk * 0.5) + (demand.count / 20));

        if (expectedQty > 0) {
          // Upsert forecast
          const existing = (await base44.asServiceRole.entities.PartsDemandForecast.filter({
            org_id,
            asset_type: assetType,
            part_sku: partSku
          }))[0];

          const forecastData = {
            org_id,
            asset_type: assetType,
            part_sku: partSku,
            part_name: pricebookItem?.name || `Part ${partSku}`,
            horizon_days: 90,
            expected_usage_qty: expectedQty,
            confidence: Math.round(confidence * 100) / 100,
            computed_at: new Date().toISOString()
          };

          if (existing) {
            await base44.asServiceRole.entities.PartsDemandForecast.update(existing.id, forecastData);
          } else {
            await base44.asServiceRole.entities.PartsDemandForecast.create(forecastData);
          }

          forecasts.push(forecastData);
        }
      }
    }

    return Response.json({
      success: true,
      forecasts: forecasts.length,
      parts_skus: [...new Set(forecasts.map(f => f.part_sku))]
    });

  } catch (error) {
    console.error('PAFE parts forecast error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});