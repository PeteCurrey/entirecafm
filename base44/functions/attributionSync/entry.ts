import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { org_id, invoice_id } = body;

    if (!org_id || !invoice_id) {
      return Response.json({ error: 'org_id and invoice_id required' }, { status: 400 });
    }

    // Get invoice
    const invoice = (await base44.asServiceRole.entities.Invoice.filter({
      id: invoice_id
    }))[0];

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get lead profile
    const leadProfile = (await base44.asServiceRole.entities.LeadProfile.filter({
      org_id,
      client_id: invoice.client_id
    }))[0];

    if (!leadProfile) {
      return Response.json({ error: 'Lead profile not found' }, { status: 404 });
    }

    // Create journey event
    await base44.asServiceRole.entities.LeadJourneyEvent.create({
      org_id,
      lead_id: leadProfile.id,
      event_type: 'INVOICE_PAID',
      event_timestamp: invoice.paid_date || new Date().toISOString(),
      event_value: {
        invoice_id: invoice.id,
        amount: invoice.total
      }
    });

    // Update lead profile to CLOSED_WON
    await base44.asServiceRole.entities.LeadProfile.update(leadProfile.id, {
      status: 'CLOSED_WON',
      last_activity_date: new Date().toISOString(),
      lead_score: Math.min(100, (leadProfile.lead_score || 50) + 20)
    });

    // Update marketing metrics if source exists
    if (leadProfile.source_id) {
      const today = new Date().toISOString().split('T')[0];
      
      const metric = (await base44.asServiceRole.entities.MarketingMetricsDaily.filter({
        org_id,
        date: today
      }))[0];

      if (metric) {
        await base44.asServiceRole.entities.MarketingMetricsDaily.update(metric.id, {
          organic_conversions: (metric.organic_conversions || 0) + 1,
          revenue_realised: (metric.revenue_realised || 0) + invoice.total
        });
      }

      // Create lead event for attribution
      await base44.asServiceRole.entities.LeadEvent.create({
        org_id,
        client_id: invoice.client_id,
        source_id: leadProfile.source_id,
        event_type: 'INVOICE_PAID',
        event_date: invoice.paid_date || new Date().toISOString(),
        event_value: invoice.total,
        metadata: {
          invoice_id: invoice.id,
          lead_id: leadProfile.id
        }
      });
    }

    return Response.json({
      success: true,
      lead_id: leadProfile.id,
      status: 'CLOSED_WON',
      revenue: invoice.total
    });

  } catch (error) {
    console.error('Attribution sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});