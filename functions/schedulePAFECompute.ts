import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const assets = await base44.asServiceRole.entities.Asset.list();
    const orgIds = [...new Set(assets.map(a => a.org_id))];
    
    const results = { success: 0, errors: [] };

    for (const orgId of orgIds) {
      try {
        await base44.asServiceRole.functions.invoke('pafe_computeAssetFeatures', { org_id: orgId });
        results.success++;
      } catch (error) {
        console.error(`Error computing features for org ${orgId}:`, error);
        results.errors.push({ org_id: orgId, error: error.message });
      }
    }

    return Response.json({
      success: true,
      processed: results.success,
      errors: results.errors.length
    });

  } catch (error) {
    console.error('PAFE compute scheduler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});