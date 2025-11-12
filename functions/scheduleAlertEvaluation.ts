import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('🔔 Starting scheduled alert evaluation for all organizations...');

    // Fetch all unique organizations from clients
    const clients = await base44.asServiceRole.entities.Client.list();
    const uniqueOrgIds = [...new Set(clients.map(c => c.org_id))];

    console.log(`📋 Found ${uniqueOrgIds.length} organizations to evaluate`);

    const results = [];

    for (const orgId of uniqueOrgIds) {
      try {
        console.log(`🔍 Evaluating alerts for org: ${orgId}`);
        
        const result = await base44.asServiceRole.functions.invoke('evaluateAlerts', {
          org_id: orgId
        });

        results.push({
          org_id: orgId,
          status: 'success',
          summary: result.data
        });

        console.log(`✅ Completed for org: ${orgId}`);
      } catch (error) {
        console.error(`❌ Failed for org ${orgId}:`, error);
        results.push({
          org_id: orgId,
          status: 'failed',
          error: error.message
        });
      }
    }

    const summary = {
      total_orgs: uniqueOrgIds.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      total_alerts_delivered: results
        .filter(r => r.status === 'success')
        .reduce((sum, r) => sum + (r.summary?.delivered || 0), 0)
    };

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      results,
      next_run: 'Scheduled for 15 minutes from now'
    });

  } catch (error) {
    console.error('scheduleAlertEvaluation error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});