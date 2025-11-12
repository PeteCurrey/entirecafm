import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '30d';
    const orgId = user.org_id;

    const daysBack = parseInt(range) || 30;
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - daysBack);

    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = today.toISOString().split('T')[0];

    console.log(`📊 Exporting marketing metrics for org ${orgId} from ${fromDateStr} to ${toDateStr}`);

    // Fetch metrics data
    const metrics = await base44.asServiceRole.entities.MarketingMetricsDaily.filter({
      org_id: orgId
    });

    // Filter by date range and sort
    const filteredMetrics = metrics
      .filter(m => m.date >= fromDateStr && m.date <= toDateStr)
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
      m.leads || '0',
      m.quotes_sent || '0',
      m.quotes_approved || '0',
      ((m.conversion_rate || 0) * 100).toFixed(1),
      (m.avg_quote_value || 0).toFixed(2),
      (m.revenue_realised || 0).toFixed(2),
      (m.spend || 0).toFixed(2),
      (m.roi || 0).toFixed(2),
      `"${m.top_source || 'N/A'}"`
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
      entity_id: `marketing-${range}`,
      new_values: {
        type: 'marketing_metrics_csv',
        range,
        rows: filteredMetrics.length
      }
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="marketing-metrics-${range}-${toDateStr}.csv"`
      }
    });

  } catch (error) {
    console.error('exportMarketing error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});