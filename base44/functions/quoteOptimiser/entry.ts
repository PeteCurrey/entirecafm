import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

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

// Sigmoid function
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

// Predict acceptance probability at given markup
function predictAcceptance(markup, features) {
  const {
    client_relationship_score = 50,
    quote_value = 0,
    response_speed_factor = 1.0,
    avg_approval_rate = 0.5
  } = features;

  let z = 1.3;
  z -= 0.8 * (markup / 100);
  z += 0.4 * (client_relationship_score / 100);
  z -= 0.3 * (quote_value / 10000);
  z += 0.2 * response_speed_factor;
  z += 0.3 * avg_approval_rate;

  return sigmoid(z);
}

// Calculate expected margin
function calculateExpectedMargin(markup, acceptProb, subtotal) {
  const marginAmount = subtotal * (markup / 100);
  return acceptProb * marginAmount;
}

// Find optimal markup using grid search
function findOptimalMarkup(features, subtotal, currentMarkup) {
  let bestMarkup = currentMarkup;
  let bestExpectedMargin = 0;
  let bestAcceptProb = 0;

  // Search range: current markup ±10%, step 1%
  const minMarkup = Math.max(5, currentMarkup - 10);
  const maxMarkup = Math.min(50, currentMarkup + 10);

  for (let markup = minMarkup; markup <= maxMarkup; markup += 0.5) {
    const acceptProb = predictAcceptance(markup, features);
    const expectedMargin = calculateExpectedMargin(markup, acceptProb, subtotal);

    if (expectedMargin > bestExpectedMargin) {
      bestExpectedMargin = expectedMargin;
      bestMarkup = markup;
      bestAcceptProb = acceptProb;
    }
  }

  return {
    optimal_markup: Math.round(bestMarkup * 10) / 10,
    accept_prob: bestAcceptProb,
    expected_margin: bestExpectedMargin
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { org_id, quote_id } = await req.json();

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    console.log(`🎯 Optimising quotes for org ${org_id}`);

    // Fetch quotes to optimize (if quote_id specified, just that one; otherwise all eligible)
    let quotesToOptimize = [];
    if (quote_id) {
      const quotes = await base44.asServiceRole.entities.Quote.filter({ id: quote_id });
      quotesToOptimize = quotes;
    } else {
      const allQuotes = await base44.asServiceRole.entities.Quote.filter({ org_id });
      quotesToOptimize = allQuotes.filter(q => 
        (q.status === 'draft' || q.status === 'sent') &&
        (q.subtotal || 0) >= 500 // Minimum £500
      );
    }

    console.log(`📊 Optimising ${quotesToOptimize.length} quotes`);

    // Fetch historical data for model training
    const [historicalQuotes, clients, leadEvents] = await Promise.all([
      base44.asServiceRole.entities.Quote.filter({ org_id }),
      base44.asServiceRole.entities.Client.filter({ org_id }),
      base44.asServiceRole.entities.LeadEvent.filter({ org_id })
    ]);

    // Filter to last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentQuotes = historicalQuotes.filter(q => 
      new Date(q.created_date) >= ninetyDaysAgo
    );

    // Calculate org-wide approval rate
    const sentQuotes = recentQuotes.filter(q => q.sent_date);
    const approvedQuotes = sentQuotes.filter(q => q.status === 'client_approved');
    const avgApprovalRate = sentQuotes.length > 0 ? approvedQuotes.length / sentQuotes.length : 0.5;

    const results = [];

    for (const quote of quotesToOptimize) {
      try {
        // Calculate current markup (estimate from subtotal to total)
        const subtotal = quote.subtotal || 0;
        const total = quote.total || 0;
        const vat = quote.vat_amount || 0;
        const currentMarkup = subtotal > 0 ? ((total - vat - subtotal) / subtotal) * 100 : 20;

        // Get client relationship score
        const client = clients.find(c => c.id === quote.client_id);
        const clientQuotes = historicalQuotes.filter(q => q.client_id === quote.client_id);
        const clientApproved = clientQuotes.filter(q => q.status === 'client_approved').length;
        const clientRelationshipScore = clientQuotes.length > 0
          ? (clientApproved / clientQuotes.length) * 100
          : 50;

        // Calculate response speed factor
        let responseSpeedFactor = 1.0;
        if (quote.sent_date && quote.created_date) {
          const hoursToSend = Math.abs(new Date(quote.sent_date) - new Date(quote.created_date)) / (1000 * 60 * 60);
          responseSpeedFactor = hoursToSend <= 24 ? 1.5 : hoursToSend <= 48 ? 1.0 : 0.7;
        }

        const features = {
          client_relationship_score: clientRelationshipScore,
          quote_value: total,
          response_speed_factor: responseSpeedFactor,
          avg_approval_rate: avgApprovalRate
        };

        // Find optimal markup
        const optimization = findOptimalMarkup(features, subtotal, currentMarkup);

        // Calculate margins
        const currentMargin = subtotal * (currentMarkup / 100);
        const projectedMargin = optimization.expected_margin;
        const deltaMargin = projectedMargin - (optimization.accept_prob * currentMargin);

        // Calculate confidence (based on historical data points)
        const confidence = Math.min(0.95, 0.6 + (clientQuotes.length / 20) * 0.3);

        // Check for existing optimization
        const existing = await base44.asServiceRole.entities.QuoteOptimisation.filter({
          quote_id: quote.id
        });

        const optimisationData = {
          org_id,
          quote_id: quote.id,
          base_markup_pct: Math.round(currentMarkup * 10) / 10,
          recommended_markup_pct: optimization.optimal_markup,
          predicted_accept_prob: Math.round(optimization.accept_prob * 1000) / 1000,
          projected_margin: Math.round(projectedMargin * 100) / 100,
          delta_margin: Math.round(deltaMargin * 100) / 100,
          confidence: Math.round(confidence * 100) / 100,
          applied: false
        };

        // Upsert
        if (existing.length > 0 && !existing[0].applied) {
          await base44.asServiceRole.entities.QuoteOptimisation.update(
            existing[0].id,
            optimisationData
          );
        } else if (existing.length === 0) {
          await base44.asServiceRole.entities.QuoteOptimisation.create(optimisationData);
        }

        results.push({
          quote_id: quote.id,
          quote_number: quote.quote_number,
          current_markup: currentMarkup,
          recommended_markup: optimization.optimal_markup,
          delta_margin: deltaMargin,
          status: 'success'
        });

        console.log(`✅ Quote ${quote.quote_number}: ${currentMarkup.toFixed(1)}% → ${optimization.optimal_markup}% (+£${deltaMargin.toFixed(0)})`);

      } catch (error) {
        console.error(`Error optimising quote ${quote.id}:`, error);
        results.push({
          quote_id: quote.id,
          status: 'failed',
          error: error.message
        });
      }
    }

    // Publish to Redis
    await publishToRedis(`quotes.org.${org_id}`, {
      type: 'optimisations_updated',
      count: results.filter(r => r.status === 'success').length,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Optimised ${results.length} quotes`);

    return Response.json({
      success: true,
      org_id,
      timestamp: new Date().toISOString(),
      quotes_optimised: results.length,
      results
    });

  } catch (error) {
    console.error('quoteOptimiser error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});