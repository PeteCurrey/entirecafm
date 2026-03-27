import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '30d'; // 7d, 30d, 90d
    const orgId = user.org_id;

    // Calculate date range
    const today = new Date();
    const daysBack = parseInt(range) || 30;
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - daysBack);

    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = today.toISOString().split('T')[0];

    console.log(`📊 Exporting metrics for org ${orgId} from ${fromDateStr} to ${toDateStr}`);

    // Fetch metrics data
    const metrics = await base44.asServiceRole.entities.DailyOrgMetrics.filter({
      org_id: orgId
    });

    // Filter by date range and sort
    const filteredMetrics = metrics
      .filter(m => m.date >= fromDateStr && m.date <= toDateStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Generate CSV
    const headers = [
      'Date',
      'Org Health Score',
      'SLA Breaches',
      'At Risk Jobs',
      'Avg Utilisation %',
      'Overdue Value (£)',
      'Unbilled Value (£)',
      'Active Jobs',
      'Completed Jobs'
    ];

    const rows = filteredMetrics.map(m => [
      m.date,
      m.org_health_score?.toFixed(1) || '0.0',
      m.sla_breaches || '0',
      m.at_risk_jobs || '0',
      m.avg_utilisation_pct?.toFixed(1) || '0.0',
      m.overdue_value?.toFixed(2) || '0.00',
      m.unbilled_value?.toFixed(2) || '0.00',
      m.active_jobs || '0',
      m.completed_jobs || '0'
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: orgId,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'Export',
      entity_id: `metrics-${range}`,
      new_values: {
        type: 'org_metrics_csv',
        range,
        rows: filteredMetrics.length
      }
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="org-metrics-${range}-${toDateStr}.csv"`
      }
    });

  } catch (error) {
    console.error('exportOrgMetrics error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});