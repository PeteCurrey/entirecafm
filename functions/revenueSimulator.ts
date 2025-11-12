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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { org_id } = await req.json();

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    console.log(`📊 Simulating revenue for org ${org_id}`);

    const today = new Date();
    const thirtyDaysOut = new Date(today);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    const ninetyDaysOut = new Date(today);
    ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);

    // Fetch all relevant data
    const [quotes, invoices, paymentScores, quoteOptimisations, jobs, clients] = await Promise.all([
      base44.asServiceRole.entities.Quote.filter({ org_id }),
      base44.asServiceRole.entities.Invoice.filter({ org_id }),
      base44.asServiceRole.entities.PaymentScore.filter({ org_id }),
      base44.asServiceRole.entities.QuoteOptimisation.filter({ org_id }),
      base44.asServiceRole.entities.Job.filter({ org_id }),
      base44.asServiceRole.entities.Client.filter({ org_id })
    ]);

    console.log(`📋 Loaded: ${quotes.length} quotes, ${invoices.length} invoices, ${jobs.length} jobs`);

    let projection30d = 0;
    let projection90d = 0;
    let confirmedPipelineValue = 0;
    let predictedPipelineValue = 0;
    let expectedMargin = 0;
    let expectedCollections = 0;

    const topClientContributions = {};

    // 1. Process Quotes
    for (const quote of quotes) {
      if (['rejected', 'expired', 'cancelled'].includes(quote.status)) continue;

      const quoteValue = quote.total || 0;
      const scheduledDate = quote.scheduled_date ? new Date(quote.scheduled_date) : new Date(quote.created_date);
      
      // Check if within projection windows
      const within30d = scheduledDate <= thirtyDaysOut;
      const within90d = scheduledDate <= ninetyDaysOut;

      if (quote.status === 'client_approved' || quote.status === 'ready_to_schedule') {
        // Confirmed pipeline (100% probability)
        confirmedPipelineValue += quoteValue;
        if (within30d) projection30d += quoteValue;
        if (within90d) projection90d += quoteValue;

        // Add margin from optimization
        const optimization = quoteOptimisations.find(o => o.quote_id === quote.id);
        if (optimization) {
          expectedMargin += optimization.projected_margin || 0;
        } else {
          // Estimate 20% margin if no optimization
          expectedMargin += quoteValue * 0.2;
        }

        // Track client contribution
        if (!topClientContributions[quote.client_id]) {
          topClientContributions[quote.client_id] = 0;
        }
        topClientContributions[quote.client_id] += quoteValue;

      } else if (quote.status === 'sent' || quote.status === 'draft') {
        // Predicted pipeline (use AI probability)
        const optimization = quoteOptimisations.find(o => o.quote_id === quote.id);
        const acceptProb = optimization?.predicted_accept_prob || 0.5; // Default 50%

        const expectedValue = quoteValue * acceptProb;
        predictedPipelineValue += expectedValue;
        
        if (within30d) projection30d += expectedValue;
        if (within90d) projection90d += expectedValue;

        // Expected margin
        if (optimization) {
          expectedMargin += optimization.projected_margin || 0;
        } else {
          expectedMargin += expectedValue * 0.2;
        }

        // Track contribution
        if (!topClientContributions[quote.client_id]) {
          topClientContributions[quote.client_id] = 0;
        }
        topClientContributions[quote.client_id] += expectedValue;
      }
    }

    // 2. Process Invoices (expected collections)
    for (const invoice of invoices) {
      if (invoice.status === 'paid' || invoice.status === 'cancelled') continue;

      const paymentScore = paymentScores.find(s => s.invoice_id === invoice.id);
      const paymentProb = paymentScore?.score || 0.5; // Default 50%
      const invoiceValue = invoice.total || 0;

      const expectedCollection = invoiceValue * paymentProb;
      expectedCollections += expectedCollection;

      // Assume invoices paid within 30 days for projection
      const dueDate = invoice.due_date ? new Date(invoice.due_date) : new Date(invoice.issue_date);
      const within30d = dueDate <= thirtyDaysOut;
      const within90d = dueDate <= ninetyDaysOut;

      if (within30d) projection30d += expectedCollection;
      if (within90d) projection90d += expectedCollection;
    }

    // 3. Process Job Backlog (estimate value from linked quotes)
    const jobBacklogValue = jobs
      .filter(j => !['completed', 'cancelled'].includes(j.status))
      .reduce((sum, job) => {
        if (job.quote_id) {
          const quote = quotes.find(q => q.id === job.quote_id);
          return sum + (quote?.total || 0);
        }
        return sum;
      }, 0);

    // This is already included in quotes, so don't double-count
    console.log(`💼 Job backlog value: £${jobBacklogValue.toLocaleString()} (included in quotes)`);

    // 4. Calculate collection probability (risk band)
    const totalOverdue = invoices
      .filter(i => {
        if (i.status === 'paid' || i.status === 'cancelled') return false;
        if (!i.due_date) return false;
        return new Date(i.due_date) < today;
      })
      .reduce((sum, i) => sum + (i.total || 0), 0);

    const collectionRatio = totalOverdue > 0 ? expectedCollections / totalOverdue : 1;
    
    let riskBand = 'LOW';
    if (collectionRatio < 0.7) riskBand = 'HIGH';
    else if (collectionRatio < 0.9) riskBand = 'MED';

    // 5. Top client contributors
    const topClients = Object.entries(topClientContributions)
      .map(([clientId, value]) => {
        const client = clients.find(c => c.id === clientId);
        return {
          client_id: clientId,
          client_name: client?.name || 'Unknown',
          value: Math.round(value)
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    // 6. Create projection
    const projectionData = {
      org_id,
      date_generated: new Date().toISOString(),
      projection_30d: Math.round(projection30d),
      projection_90d: Math.round(projection90d),
      confirmed_pipeline_value: Math.round(confirmedPipelineValue),
      predicted_pipeline_value: Math.round(predictedPipelineValue),
      expected_margin: Math.round(expectedMargin),
      expected_collections: Math.round(expectedCollections),
      risk_band: riskBand,
      assumptions_json: {
        top_clients: topClients,
        quote_count: quotes.filter(q => !['rejected', 'expired'].includes(q.status)).length,
        invoice_count: invoices.filter(i => i.status !== 'paid').length,
        avg_accept_prob: predictedPipelineValue > 0 ? predictedPipelineValue / (confirmedPipelineValue + predictedPipelineValue) : 0,
        collection_ratio: Math.round(collectionRatio * 100) / 100
      }
    };

    const projection = await base44.asServiceRole.entities.RevenueProjection.create(projectionData);

    // Publish to multiple channels
    await publishToRedis(`revenue.org.${org_id}`, {
      type: 'forecast_updated',
      projection_30d: projection30d,
      projection_90d: projection90d,
      risk_band: riskBand,
      timestamp: new Date().toISOString()
    });

    await publishToRedis(`director.org.${org_id}`, {
      type: 'revenue_forecast_available',
      projection_30d: projection30d,
      expected_margin: expectedMargin,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Revenue projection: 30d=£${projection30d.toLocaleString()}, 90d=£${projection90d.toLocaleString()}, Risk=${riskBand}`);

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: 'system',
      action: 'CREATE',
      entity_type: 'RevenueProjection',
      entity_id: projection.id,
      new_values: projectionData
    });

    return Response.json({
      success: true,
      projection: projectionData,
      top_clients: topClients
    });

  } catch (error) {
    console.error('revenueSimulator error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});