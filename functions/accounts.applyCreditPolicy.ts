import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = user.org_id;

    console.log(`📊 Exporting overdue invoices for org ${orgId}`);

    // Fetch all invoices, features, and scores
    const [invoices, features, scores, clients] = await Promise.all([
      base44.asServiceRole.entities.Invoice.filter({ org_id: orgId }),
      base44.asServiceRole.entities.InvoiceFeatures.filter({ org_id: orgId }),
      base44.asServiceRole.entities.PaymentScore.filter({ org_id: orgId }),
      base44.asServiceRole.entities.Client.filter({ org_id: orgId })
    ]);

    // Filter to overdue only
    const today = new Date();
    const overdueInvoices = invoices.filter(i => {
      if (i.status === 'paid' || i.status === 'cancelled') return false;
      if (!i.due_date) return false;
      return new Date(i.due_date) < today;
    });

    // Build export data
    const exportData = overdueInvoices.map(invoice => {
      const feature = features.find(f => f.invoice_id === invoice.id);
      const score = scores.find(s => s.invoice_id === invoice.id);
      const client = clients.find(c => c.id === invoice.client_id);

      return {
        invoice_number: invoice.invoice_number || invoice.id.slice(0, 8),
        client_name: client?.name || 'Unknown',
        amount: invoice.total || 0,
        days_overdue: feature?.days_outstanding || 0,
        score: score?.score || 0,
        risk_band: score?.risk_band || 'N/A',
        next_action: score?.next_action || 'N/A',
        due_date: invoice.due_date,
        issue_date: invoice.issue_date
      };
    });

    // Sort by risk (HIGH first) then by days overdue
    exportData.sort((a, b) => {
      const riskOrder = { 'HIGH': 0, 'MED': 1, 'LOW': 2, 'N/A': 3 };
      if (riskOrder[a.risk_band] !== riskOrder[b.risk_band]) {
        return riskOrder[a.risk_band] - riskOrder[b.risk_band];
      }
      return b.days_overdue - a.days_overdue;
    });

    // Generate CSV
    const headers = [
      'Invoice #',
      'Client',
      'Amount (£)',
      'Days Overdue',
      'Payment Score',
      'Risk Band',
      'Next Action',
      'Due Date',
      'Issue Date'
    ];

    const rows = exportData.map(d => [
      d.invoice_number,
      d.client_name,
      d.amount.toFixed(2),
      d.days_overdue,
      d.score.toFixed(3),
      d.risk_band,
      `"${d.next_action}"`, // Quoted for CSV
      d.due_date || '',
      d.issue_date || ''
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
      entity_id: 'overdues-csv',
      new_values: {
        type: 'overdue_invoices_csv',
        rows: exportData.length
      }
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="overdue-invoices-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('exportOverdues error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});