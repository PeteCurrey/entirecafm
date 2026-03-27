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
      leads_created: 0,
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
          // Get or create lead profile
          let leadProfile = (await base44.asServiceRole.entities.LeadProfile.filter({
            org_id,
            client_id: quote.client_id
          }))[0];

          const client = (await base44.asServiceRole.entities.Client.filter({ 
            id: quote.client_id 
          }))[0];
          
          if (!client) continue;

          if (!leadProfile) {
            leadProfile = await base44.asServiceRole.entities.LeadProfile.create({
              org_id,
              client_id: quote.client_id,
              contact_name: client.primary_contact_name,
              contact_email: client.primary_contact_email,
              contact_phone: client.primary_contact_phone,
              first_contact_date: quote.created_date,
              last_activity_date: quote.sent_date,
              lead_score: 50,
              status: 'ACTIVE'
            });
            results.leads_created++;
          }

          // Check if follow-up already sent recently
          const recentEvents = await base44.asServiceRole.entities.LeadJourneyEvent.filter({
            lead_id: leadProfile.id,
            event_type: 'FOLLOW_UP_SENT'
          });

          const recentFollowUp = recentEvents.find(e => {
            const eventDate = new Date(e.event_timestamp);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return eventDate >= sevenDaysAgo;
          });

          if (recentFollowUp) continue;

          // Get template or generate AI email
          const template = (await base44.asServiceRole.entities.LeadEmailTemplate.filter({
            org_id,
            trigger_condition: 'QUOTE_NOT_APPROVED_30D',
            is_active: true
          }))[0];

          let subject, body;

          if (template) {
            const daysSince = Math.floor((new Date() - new Date(quote.sent_date)) / (1000 * 60 * 60 * 24));
            subject = template.subject
              .replace('{{client_name}}', client.name)
              .replace('{{quote_number}}', quote.quote_number || quote.id.slice(0, 8))
              .replace('{{days_since_quote}}', daysSince);
            
            body = template.body_html
              .replace('{{client_name}}', client.name)
              .replace('{{quote_number}}', quote.quote_number || quote.id.slice(0, 8))
              .replace('{{quote_value}}', `£${quote.total?.toLocaleString() || '0'}`)
              .replace('{{days_since_quote}}', daysSince);
          } else {
            const aiEmail = await base44.integrations.Core.InvokeLLM({
              prompt: `Write a professional follow-up email for a quote that was sent 30+ days ago.

Client: ${client.name}
Quote: ${quote.title}
Quote Total: £${quote.total}

The email should:
- Be warm and helpful, not pushy
- Check if they need clarification or have questions
- Offer to adjust the quote if needed
- Include a clear call-to-action
- Be concise (under 150 words)
- Professional but personable tone

Return JSON with 'subject' and 'body' fields.`,
              response_json_schema: {
                type: "object",
                properties: {
                  subject: { type: "string" },
                  body: { type: "string" }
                }
              }
            });

            subject = aiEmail.subject;
            body = aiEmail.body;
          }

          // Send email
          await base44.integrations.Core.SendEmail({
            to: client.primary_contact_email,
            subject,
            body
          });

          // Log journey event
          await base44.asServiceRole.entities.LeadJourneyEvent.create({
            org_id,
            lead_id: leadProfile.id,
            event_type: 'FOLLOW_UP_SENT',
            event_timestamp: new Date().toISOString(),
            event_value: {
              quote_id: quote.id,
              subject,
              trigger: 'quote_not_approved_30d'
            }
          });

          // Update lead profile
          await base44.asServiceRole.entities.LeadProfile.update(leadProfile.id, {
            last_activity_date: new Date().toISOString(),
            status: 'DORMANT',
            lead_score: Math.max(0, (leadProfile.lead_score || 50) - 10),
            next_action: 'Awaiting quote approval response'
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

    return Response.json({
      success: true,
      ...results,
      message: `Sent ${results.follow_ups_sent} follow-ups, created ${results.leads_created} lead profiles`
    });

  } catch (error) {
    console.error('Lead lifecycle error:', error);
    return Response.json({ 
      error: error.message || 'Failed to process lead lifecycle'
    }, { status: 500 });
  }
});