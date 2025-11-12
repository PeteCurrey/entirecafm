import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = user.org_id;

    console.log(`📊 Exporting revenue forecast for org ${orgId}`);

    // Fetch all revenue projections
    const projections = await base44.asServiceRole.entities.RevenueProjection.filter({
      org_id: orgId
    });

    // Sort by date descending
    const sortedProjections = projections.sort((a, b) => 
      new Date(b.date_generated) - new Date(a.date_generated)
    );

    // Take last 30 entries
    const exportData = sortedProjections.slice(0, 30);

    // Generate CSV
    const headers = [
      'Date Generated',
      'Projection 30d (£)',
      'Projection 90d (£)',
      'Confirmed Pipeline (£)',
      'Predicted Pipeline (£)',
      'Expected Margin (£)',
      'Expected Collections (£)',
      'Risk Band',
      'Collection Ratio'
    ];

    const rows = exportData.map(p => [
      p.date_generated?.split('T')[0] || '',
      (p.projection_30d || 0).toFixed(2),
      (p.projection_90d || 0).toFixed(2),
      (p.confirmed_pipeline_value || 0).toFixed(2),
      (p.predicted_pipeline_value || 0).toFixed(2),
      (p.expected_margin || 0).toFixed(2),
      (p.expected_collections || 0).toFixed(2),
      p.risk_band || 'N/A',
      (p.assumptions_json?.collection_ratio || 0).toFixed(2)
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
      entity_id: 'revenue-forecast-csv',
      new_values: {
        type: 'revenue_forecast_csv',
        rows: exportData.length
      }
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="revenue-forecast-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('exportRevenueForecast error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});