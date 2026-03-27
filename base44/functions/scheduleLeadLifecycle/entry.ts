import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all organizations with quotes
    const quotes = await base44.asServiceRole.entities.Quote.list();
    const orgIds = [...new Set(quotes.map(q => q.org_id))];
    
    const results = { success: 0, errors: [] };

    for (const orgId of orgIds) {
      try {
        // Run follow-ups and attribution
        await base44.asServiceRole.functions.invoke('lead_lifecycle', {
          org_id: orgId,
          action: 'all'
        });
        
        results.success++;
      } catch (error) {
        console.error(`Error processing lead lifecycle for org ${orgId}:`, error);
        results.errors.push({
          org_id: orgId,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      processed: results.success,
      errors: results.errors.length,
      message: `Processed lead lifecycle for ${results.success} organizations`
    });

  } catch (error) {
    console.error('Lead lifecycle scheduler error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});