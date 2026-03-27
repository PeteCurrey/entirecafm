import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// This function should be called via a cron job or scheduler
// to auto-publish director dashboard updates every 15 minutes

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Use service role to run scheduled task
    const orgs = await base44.asServiceRole.entities.Client.list();
    const uniqueOrgIds = [...new Set(orgs.map(o => o.org_id).filter(Boolean))];

    console.log(`🔄 Scheduled update for ${uniqueOrgIds.length} organizations`);

    const results = [];

    for (const org_id of uniqueOrgIds) {
      try {
        // Invoke the director dashboard function for each org
        const result = await base44.asServiceRole.functions.invoke('aiDirectorDashboard', {
          org_id
        });

        results.push({
          org_id,
          success: true,
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Updated dashboard for org: ${org_id}`);
      } catch (error) {
        console.error(`❌ Failed to update org ${org_id}:`, error);
        results.push({
          org_id,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Scheduled director dashboard update completed',
      organizations_updated: uniqueOrgIds.length,
      results,
      next_run: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('scheduleDirectorDashboard error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});