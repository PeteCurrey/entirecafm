import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch invoices with related data
    const invoices = await base44.entities.Invoice.list('-issue_date');
    const clients = await base44.entities.Client.list();
    const jobs = await base44.entities.Job.list();
    const quotes = await base44.entities.Quote.list();

    // Create CSV headers
    const headers = [
      'Invoice Number',
      'Client',
      'Job Number',
      'Quote Number',
      'Issue Date',
      'Due Date',
      'Subtotal',
      'VAT Amount',
      'Total',
      'Status',
      'PO Number',
      'Paid Date',
      'Payment Method'
    ];

    // Build CSV rows
    const rows = invoices.map(invoice => {
      const client = clients.find(c => c.id === invoice.client_id);
      const job = jobs.find(j => j.id === invoice.job_id);
      const quote = quotes.find(q => q.id === invoice.quote_id);

      return [
        invoice.invoice_number || '',
        client?.name || '',
        job?.job_number || '',
        quote?.quote_number || '',
        invoice.issue_date || '',
        invoice.due_date || '',
        invoice.subtotal?.toFixed(2) || '0.00',
        invoice.vat_amount?.toFixed(2) || '0.00',
        invoice.total?.toFixed(2) || '0.00',
        invoice.status || '',
        invoice.po_number || '',
        invoice.paid_date || '',
        invoice.payment_method || ''
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escape fields containing commas or quotes
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      )
    ].join('\n');

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="invoices_export_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('CSV Export Error:', error);
    return Response.json({ 
      error: 'Failed to export invoices',
      details: error.message 
    }, { status: 500 });
  }
});