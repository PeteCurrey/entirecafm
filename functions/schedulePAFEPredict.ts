import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const features = await base44.asServiceRole.entities.AssetFeatures.list();
    const orgIds = [...new Set(features.map(f => f.org_id))];
    
    const results = { success: 0, errors: [] };

    for (const orgId of orgIds) {
      try {
        await base44.asServiceRole.functions.invoke('pafe_predictFailure', { org_id: orgId });
        results.success++;
      } catch (error) {
        console.error(`Error predicting for org ${orgId}:`, error);
        results.errors.push({ org_id: orgId, error: error.message });
      }
    }

    return Response.json({
      success: true,
      predicted: results.success,
      errors: results.errors.length
    });

  } catch (error) {
    console.error('PAFE predict scheduler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});