import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { org_id } = body;

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    const leads = await base44.asServiceRole.entities.LeadProfile.filter({ org_id });
    const updated = [];

    for (const lead of leads) {
      let score = 50;

      // Get journey events
      const events = await base44.asServiceRole.entities.LeadJourneyEvent.filter({
        lead_id: lead.id
      });

      // Calculate quote approval rate (+10 per approval)
      const quotesSent = events.filter(e => e.event_type === 'QUOTE_SENT').length;
      const quotesApproved = events.filter(e => e.event_type === 'QUOTE_APPROVED').length;
      const approvalRate = quotesSent > 0 ? quotesApproved / quotesSent : 0;
      score += Math.round(10 * approvalRate);

      // Email engagement (+8 per open)
      const emailsSent = events.filter(e => e.event_type === 'EMAIL_SENT').length;
      const emailsOpened = events.filter(e => e.event_type === 'EMAIL_OPEN').length;
      const openRate = emailsSent > 0 ? emailsOpened / emailsSent : 0;
      score += Math.round(8 * openRate);

      // Source quality (+5 if high-quality source)
      if (lead.source_id) {
        const source = (await base44.asServiceRole.entities.LeadSource.filter({
          id: lead.source_id
        }))[0];
        if (source && source.channel === 'referral') score += 5;
      }

      // Days since last activity penalty (-0.2 per day)
      if (lead.last_activity_date) {
        const daysSince = Math.floor(
          (new Date() - new Date(lead.last_activity_date)) / (1000 * 60 * 60 * 24)
        );
        score -= Math.round(0.2 * daysSince);
      }

      // Clamp to 0-100
      score = Math.max(0, Math.min(100, score));

      // Determine status based on activity
      let status = lead.status;
      const daysSinceActivity = lead.last_activity_date
        ? Math.floor((new Date() - new Date(lead.last_activity_date)) / (1000 * 60 * 60 * 24))
        : 999;

      if (events.some(e => e.event_type === 'INVOICE_PAID')) {
        status = 'CLOSED_WON';
      } else if (daysSinceActivity > 90) {
        status = 'DORMANT';
      } else if (daysSinceActivity > 60 && status !== 'CLOSED_WON') {
        status = 'DORMANT';
      } else if (events.length > 0 && status === 'NEW') {
        status = 'ACTIVE';
      }

      // Update lead
      await base44.asServiceRole.entities.LeadProfile.update(lead.id, {
        lead_score: score,
        status
      });

      updated.push({ lead_id: lead.id, score, status });
    }

    return Response.json({
      success: true,
      updated: updated.length,
      leads: updated
    });

  } catch (error) {
    console.error('Lead scoring error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});