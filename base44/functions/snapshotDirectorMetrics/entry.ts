import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('📸 Starting daily metrics snapshot for all organizations...');

    // Fetch all unique organizations from clients
    const clients = await base44.asServiceRole.entities.Client.list();
    const uniqueOrgIds = [...new Set(clients.map(c => c.org_id))];

    console.log(`📋 Found ${uniqueOrgIds.length} organizations to snapshot`);

    const results = [];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    for (const orgId of uniqueOrgIds) {
      try {
        console.log(`📊 Snapshotting metrics for org: ${orgId}`);
        
        // Step 1: Get latest dashboard metrics
        const dashboardResult = await base44.asServiceRole.functions.invoke('aiDirectorDashboard', {
          org_id: orgId
        });

        if (!dashboardResult.data?.success) {
          throw new Error('Failed to fetch dashboard metrics');
        }

        const data = dashboardResult.data;

        // Step 2: Check if snapshot already exists for today
        const existingSnapshots = await base44.asServiceRole.entities.DailyOrgMetrics.filter({
          org_id: orgId,
          date: today
        });

        const metricsData = {
          org_id: orgId,
          date: today,
          org_health_score: data.org_health_score || 0,
          sla_breaches: data.summary?.sla_breaches || 0,
          at_risk_jobs: data.summary?.at_risk_jobs || 0,
          avg_utilisation_pct: data.summary?.avg_engineer_utilisation || 0,
          overdue_value: data.financials?.outstanding_invoices?.overdue_value || 0,
          unbilled_value: data.financials?.unbilled_quotes?.approved_unbilled || 0,
          active_jobs: data.summary?.active_jobs || 0,
          completed_jobs: data.summary?.completed_jobs || 0
        };

        // Step 3: Upsert (update if exists, create if not)
        let snapshot;
        if (existingSnapshots.length > 0) {
          snapshot = await base44.asServiceRole.entities.DailyOrgMetrics.update(
            existingSnapshots[0].id,
            metricsData
          );
          console.log(`✅ Updated snapshot for org: ${orgId}`);
        } else {
          snapshot = await base44.asServiceRole.entities.DailyOrgMetrics.create(metricsData);
          console.log(`✅ Created snapshot for org: ${orgId}`);
        }

        results.push({
          org_id: orgId,
          status: 'success',
          snapshot_id: snapshot.id,
          action: existingSnapshots.length > 0 ? 'updated' : 'created'
        });

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
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length
    };

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: 'system',
      user_id: 'system',
      action: 'CREATE',
      entity_type: 'DailyOrgMetrics',
      entity_id: 'batch',
      new_values: summary
    });

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      snapshot_date: today,
      summary,
      results,
      next_scheduled: '23:55 Europe/London daily'
    });

  } catch (error) {
    console.error('snapshotDirectorMetrics error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});