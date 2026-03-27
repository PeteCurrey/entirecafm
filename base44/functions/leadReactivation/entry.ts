import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { org_id } = body;

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Find dormant leads
    const leads = await base44.asServiceRole.entities.LeadProfile.filter({
      org_id,
      status: 'DORMANT'
    });

    const reactivated = [];

    for (const lead of leads) {
      try {
        // Check last activity
        if (!lead.last_activity_date) continue;
        const lastActivity = new Date(lead.last_activity_date);
        if (lastActivity > ninetyDaysAgo) continue;

        // Get client details
        const client = (await base44.asServiceRole.entities.Client.filter({
          id: lead.client_id
        }))[0];

        if (!client || !client.primary_contact_email) continue;

        // Get template
        const template = (await base44.asServiceRole.entities.LeadEmailTemplate.filter({
          org_id,
          trigger_condition: 'DORMANT_90D',
          is_active: true
        }))[0];

        let subject, body;

        if (template) {
          // Use template
          subject = template.subject
            .replace('{{client_name}}', client.name)
            .replace('{{contact_name}}', lead.contact_name || client.name);
          
          body = template.body_html
            .replace('{{client_name}}', client.name)
            .replace('{{contact_name}}', lead.contact_name || client.name)
            .replace('{{days_inactive}}', Math.floor((new Date() - lastActivity) / (1000 * 60 * 60 * 24)));
        } else {
          // Generate AI reactivation email
          const aiEmail = await base44.integrations.Core.InvokeLLM({
            prompt: `Write a friendly reactivation email for a dormant client who hasn't used our facilities management services in 90+ days.

Client: ${client.name}
Contact: ${lead.contact_name || client.name}

The email should:
- Express that we miss working with them
- Ask if they still need facilities management support
- Mention new services or improvements
- Include a clear CTA to get back in touch
- Be warm and non-pushy (under 120 words)

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
          lead_id: lead.id,
          event_type: 'FOLLOW_UP_SENT',
          event_timestamp: new Date().toISOString(),
          event_value: {
            trigger: 'reactivation_90d',
            subject
          }
        });

        // Update lead
        await base44.asServiceRole.entities.LeadProfile.update(lead.id, {
          last_activity_date: new Date().toISOString(),
          next_action: 'Awaiting response to reactivation email'
        });

        reactivated.push({ lead_id: lead.id, client: client.name });

      } catch (error) {
        console.error(`Error reactivating lead ${lead.id}:`, error);
      }
    }

    return Response.json({
      success: true,
      reactivated: reactivated.length,
      leads: reactivated
    });

  } catch (error) {
    console.error('Lead reactivation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});