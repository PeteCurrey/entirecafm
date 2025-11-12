import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = user.org_id;
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    console.log(`📊 Exporting marketing metrics for org ${orgId}, last ${days} days`);

    // Calculate date range
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split('T')[0];

    // Fetch metrics
    const allMetrics = await base44.asServiceRole.entities.MarketingMetricsDaily.filter({
      org_id: orgId
    });

    const filteredMetrics = allMetrics
      .filter(m => m.date >= fromDateStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Generate CSV
    const headers = [
      'Date',
      'Leads',
      'Quotes Sent',
      'Quotes Approved',
      'Conversion Rate (%)',
      'Avg Quote Value (£)',
      'Revenue Realised (£)',
      'Spend (£)',
      'ROI',
      'Top Source'
    ];

    const rows = filteredMetrics.map(m => [
      m.date,
      m.leads || 0,
      m.quotes_sent || 0,
      m.quotes_approved || 0,
      ((m.conversion_rate || 0) * 100).toFixed(1),
      (m.avg_quote_value || 0).toFixed(2),
      (m.revenue_realised || 0).toFixed(2),
      (m.spend || 0).toFixed(2),
      (m.roi || 0).toFixed(2),
      m.top_source || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: orgId,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'Export',
      entity_id: 'marketing-metrics-csv',
      new_values: {
        type: 'marketing_metrics_csv',
        days,
        rows: filteredMetrics.length
      }
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="marketing-metrics-${days}d-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('exportMetrics error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});