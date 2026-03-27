import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const leads = await base44.asServiceRole.entities.LeadProfile.filter({ status: 'DORMANT' });
    const orgIds = [...new Set(leads.map(l => l.org_id))];
    
    const results = { success: 0, errors: [] };

    for (const orgId of orgIds) {
      try {
        await base44.asServiceRole.functions.invoke('leadReactivation', { org_id: orgId });
        results.success++;
      } catch (error) {
        console.error(`Error reactivating leads for org ${orgId}:`, error);
        results.errors.push({ org_id: orgId, error: error.message });
      }
    }

    return Response.json({
      success: true,
      reactivated: results.success,
      errors: results.errors.length
    });

  } catch (error) {
    console.error('Lead reactivation scheduler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});