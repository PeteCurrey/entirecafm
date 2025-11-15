import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all organizations with marketing data
    const metrics = await base44.asServiceRole.entities.MarketingMetricsDaily.list();
    const orgIds = [...new Set(metrics.map(m => m.org_id))];
    
    const results = { success: 0, errors: [] };

    for (const orgId of orgIds) {
      try {
        await base44.asServiceRole.functions.invoke('marketingCampaignInsight', {
          org_id: orgId
        });
        
        results.success++;
      } catch (error) {
        console.error(`Error computing insights for org ${orgId}:`, error);
        results.errors.push({
          org_id: orgId,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      computed: results.success,
      errors: results.errors.length,
      message: `Computed marketing insights for ${results.success} organizations`
    });

  } catch (error) {
    console.error('Marketing insights scheduler error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});