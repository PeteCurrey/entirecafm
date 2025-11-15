import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { org_id, action = 'follow_up' } = body;

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    const results = {
      follow_ups_sent: 0,
      attributions_updated: 0,
      errors: []
    };

    if (action === 'follow_up' || action === 'all') {
      // Find quotes sent but not approved in 30+ days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const quotes = await base44.asServiceRole.entities.Quote.filter({ 
        org_id,
        status: 'sent'
      });

      const staleQuotes = quotes.filter(q => {
        if (!q.sent_date) return false;
        const sentDate = new Date(q.sent_date);
        return sentDate <= thirtyDaysAgo;
      });

      for (const quote of staleQuotes) {
        try {
          // Get client details
          const client = await base44.asServiceRole.entities.Client.filter({ 
            id: quote.client_id 
          });
          
          if (!client || client.length === 0) continue;
          const clientData = client[0];

          // Check if follow-up already sent recently (avoid spam)
          const recentEvents = await base44.asServiceRole.entities.LeadEvent.filter({
            org_id,
            client_id: quote.client_id,
            event_type: 'FOLLOW_UP'
          });

          const recentFollowUp = recentEvents.find(e => {
            const eventDate = new Date(e.event_date);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return eventDate >= sevenDaysAgo;
          });

          if (recentFollowUp) {
            console.log(`Skipping ${clientData.name} - follow-up sent recently`);
            continue;
          }

          // Generate AI-powered follow-up email
          const emailContent = await base44.integrations.Core.InvokeLLM({
            prompt: `Write a professional, friendly follow-up email for a quote that was sent 30+ days ago.

Client: ${clientData.name}
Quote: ${quote.title}
Quote Total: £${quote.total}

The email should:
- Be warm and helpful, not pushy
- Check if they need any clarification or have questions
- Offer to adjust the quote if needed
- Include a clear call-to-action
- Be concise (under 150 words)
- Professional but personable tone

Return as object with 'subject' and 'body' fields.`,
            response_json_schema: {
              type: "object",
              properties: {
                subject: { type: "string" },
                body: { type: "string" }
              }
            }
          });

          // Send email
          await base44.integrations.Core.SendEmail({
            to: clientData.primary_contact_email,
            subject: emailContent.subject,
            body: emailContent.body
          });

          // Log follow-up to lead_event
          await base44.asServiceRole.entities.LeadEvent.create({
            org_id,
            client_id: quote.client_id,
            quote_id: quote.id,
            event_type: 'FOLLOW_UP',
            event_date: new Date().toISOString(),
            event_value: quote.total,
            metadata: {
              email_subject: emailContent.subject,
              follow_up_reason: 'quote_stale_30d'
            }
          });

          results.follow_ups_sent++;

        } catch (error) {
          console.error(`Error processing quote ${quote.id}:`, error);
          results.errors.push({
            quote_id: quote.id,
            error: error.message
          });
        }
      }
    }

    if (action === 'attribution' || action === 'all') {
      // Find paid invoices without lead source attribution
      const invoices = await base44.asServiceRole.entities.Invoice.filter({
        org_id,
        status: 'paid'
      });

      for (const invoice of invoices) {
        try {
          // Check if attribution already exists
          const existingAttribution = await base44.asServiceRole.entities.LeadEvent.filter({
            org_id,
            client_id: invoice.client_id,
            event_type: 'INVOICE_PAID',
            invoice_id: invoice.id
          });

          if (existingAttribution.length > 0) {
            continue; // Already attributed
          }

          // Find the lead source for this client
          const leadEvents = await base44.asServiceRole.entities.LeadEvent.filter({
            org_id,
            client_id: invoice.client_id,
            event_type: 'ENQUIRY'
          });

          if (leadEvents.length === 0) {
            // No lead source found, mark as 'Direct'
            await base44.asServiceRole.entities.LeadEvent.create({
              org_id,
              client_id: invoice.client_id,
              invoice_id: invoice.id,
              event_type: 'INVOICE_PAID',
              event_date: invoice.paid_date || new Date().toISOString(),
              event_value: invoice.total,
              source_id: null,
              metadata: {
                source: 'Direct',
                invoice_number: invoice.invoice_number
              }
            });
          } else {
            // Use the original lead source
            const firstEnquiry = leadEvents.sort((a, b) => 
              new Date(a.event_date) - new Date(b.event_date)
            )[0];

            await base44.asServiceRole.entities.LeadEvent.create({
              org_id,
              client_id: invoice.client_id,
              invoice_id: invoice.id,
              event_type: 'INVOICE_PAID',
              event_date: invoice.paid_date || new Date().toISOString(),
              event_value: invoice.total,
              source_id: firstEnquiry.source_id,
              metadata: {
                invoice_number: invoice.invoice_number,
                original_enquiry_date: firstEnquiry.event_date
              }
            });
          }

          results.attributions_updated++;

        } catch (error) {
          console.error(`Error attributing invoice ${invoice.id}:`, error);
          results.errors.push({
            invoice_id: invoice.id,
            error: error.message
          });
        }
      }
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'LeadLifecycle',
      entity_id: org_id,
      new_values: results,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      ...results,
      message: `Sent ${results.follow_ups_sent} follow-ups, updated ${results.attributions_updated} attributions`
    });

  } catch (error) {
    console.error('Lead lifecycle error:', error);
    return Response.json({ 
      error: error.message || 'Failed to process lead lifecycle'
    }, { status: 500 });
  }
});