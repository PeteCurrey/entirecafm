import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
const SLACK_WEBHOOK = Deno.env.get('SLACK_WEBHOOK_MARKETING');

async function publishToRedis(channel, message) {
  if (!REDIS_URL || !REDIS_TOKEN) return;

  try {
    await fetch(`${REDIS_URL}/publish/${channel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: JSON.stringify(message) })
    });
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

async function postToSlack(message) {
  if (!SLACK_WEBHOOK) return;

  try {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });
  } catch (error) {
    console.error('Slack post error:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { org_id } = await req.json();

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    console.log(`💰 Allocating budget for org ${org_id}`);

    // Fetch 30-day lead events and sources
    const [leadEvents, sources] = await Promise.all([
      base44.asServiceRole.entities.LeadEvent.filter({ org_id }),
      base44.asServiceRole.entities.LeadSource.filter({ org_id, is_active: true })
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentEvents = leadEvents.filter(e => new Date(e.event_date) >= thirtyDaysAgo);

    // Calculate metrics per source
    const sourceMetrics = sources.map(source => {
      const sourceEvents = recentEvents.filter(e => e.source_id === source.id);
      
      const quotesSent = sourceEvents.filter(e => e.event_type === 'QUOTE_SENT').length;
      const quotesApproved = sourceEvents.filter(e => e.event_type === 'QUOTE_APPROVED').length;
      const revenue = sourceEvents
        .filter(e => e.event_type === 'INVOICE_PAID')
        .reduce((sum, e) => sum + (e.event_value || 0), 0);
      
      const conversionRate = quotesSent > 0 ? quotesApproved / quotesSent : 0;
      const cost = source.cost_per_month || 0;
      const roi = cost > 0 ? revenue / cost : 0;
      const avgLeadValue = quotesApproved > 0 ? revenue / quotesApproved : 0;
      
      // Weighted ROI score (combines ROI and conversion)
      const weightedScore = roi * Math.sqrt(conversionRate);
      
      return {
        source_id: source.id,
        source_name: source.name,
        current_budget: cost,
        roi,
        conversion_rate: conversionRate,
        avg_lead_value: avgLeadValue,
        weighted_score: weightedScore,
        revenue
      };
    }).filter(m => m.current_budget > 0); // Only sources with spend

    if (sourceMetrics.length === 0) {
      console.log('⚠️  No sources with budget to allocate');
      return Response.json({
        success: true,
        message: 'No sources with budget',
        allocations: []
      });
    }

    // Sort by weighted score
    sourceMetrics.sort((a, b) => b.weighted_score - a.weighted_score);

    // Determine quartiles
    const quartileSize = Math.ceil(sourceMetrics.length / 4);
    
    const allocations = [];
    const totalBudget = sourceMetrics.reduce((sum, m) => sum + m.current_budget, 0);

    for (let i = 0; i < sourceMetrics.length; i++) {
      const metric = sourceMetrics[i];
      let changePct = 0;

      if (i < quartileSize) {
        // Top quartile: increase +10%
        changePct = 10;
      } else if (i >= sourceMetrics.length - quartileSize) {
        // Bottom quartile: decrease -10%
        changePct = -10;
      }
      // Middle: 0% change

      // Cap variance at ±20%
      changePct = Math.max(-20, Math.min(20, changePct));

      const recommendedBudget = metric.current_budget * (1 + changePct / 100);

      // Check if allocation already exists for today
      const today = new Date().toISOString().split('T')[0];
      const existing = await base44.asServiceRole.entities.CampaignAllocation.filter({
        org_id,
        source_id: metric.source_id,
        effective_from: today
      });

      const allocationData = {
        org_id,
        source_id: metric.source_id,
        current_budget: metric.current_budget,
        recommended_budget: Math.round(recommendedBudget),
        roi: Math.round(metric.roi * 100) / 100,
        conversion_rate: Math.round(metric.conversion_rate * 1000) / 1000,
        avg_lead_value: Math.round(metric.avg_lead_value),
        change_pct: changePct,
        effective_from: today,
        status: 'PENDING'
      };

      // Upsert
      if (existing.length > 0) {
        await base44.asServiceRole.entities.CampaignAllocation.update(
          existing[0].id,
          allocationData
        );
      } else {
        await base44.asServiceRole.entities.CampaignAllocation.create(allocationData);
      }

      allocations.push({
        source_name: metric.source_name,
        current: metric.current_budget,
        recommended: Math.round(recommendedBudget),
        change_pct: changePct,
        roi: metric.roi,
        conversion: metric.conversion_rate
      });
    }

    // Publish to Redis
    await publishToRedis(`marketing.org.${org_id}`, {
      type: 'allocation_update',
      allocations_count: allocations.length,
      timestamp: new Date().toISOString()
    });

    // Post to Slack
    if (SLACK_WEBHOOK) {
      const slackMessage = `📊 *Marketing Budget Allocation Recommendations*\n\n` +
        allocations.map(a => {
          const arrow = a.change_pct > 0 ? '📈' : a.change_pct < 0 ? '📉' : '➖';
          return `${arrow} *${a.source_name}*: £${a.current} → £${a.recommended} (${a.change_pct > 0 ? '+' : ''}${a.change_pct}%) | ROI: ${a.roi.toFixed(1)}x | Conv: ${(a.conversion * 100).toFixed(1)}%`;
        }).join('\n') +
        `\n\n_View details in AI Marketing Dashboard > Optimisation tab_`;
      
      await postToSlack(slackMessage);
    }

    console.log(`✅ Generated ${allocations.length} budget allocations`);

    return Response.json({
      success: true,
      org_id,
      timestamp: new Date().toISOString(),
      allocations_generated: allocations.length,
      allocations
    });

  } catch (error) {
    console.error('allocateBudget error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});