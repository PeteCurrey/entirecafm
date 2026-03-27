import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

async function publishToRedis(channel, message) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/publish/${channel}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` },
      body: JSON.stringify(message)
    });
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { org_id } = body;
    const orgId = org_id || user.org_id || 'default-org';

    console.log(`💰 AI Financial Forecaster for org: ${orgId}`);

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    const sixtyDays = new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000));
    const ninetyDays = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

    // Fetch financial data
    const [invoices, quotes, clients, jobs] = await Promise.all([
      base44.asServiceRole.entities.Invoice.filter({ org_id: orgId }),
      base44.asServiceRole.entities.Quote.filter({ org_id: orgId }),
      base44.asServiceRole.entities.Client.filter({ org_id: orgId }),
      base44.asServiceRole.entities.Job.filter({ org_id: orgId })
    ]);

    console.log(`📊 Fetched: ${invoices.length} invoices, ${quotes.length} quotes`);

    // Calculate current outstanding
    const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid');
    const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Categorize invoices by risk
    const invoicesByRisk = {
      low: [],
      medium: [],
      high: []
    };

    for (const invoice of unpaidInvoices) {
      const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
      const daysOverdue = dueDate ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;

      let risk = 'low';
      let probability = 0.95;

      if (daysOverdue > 60) {
        risk = 'high';
        probability = 0.40;
      } else if (daysOverdue > 30) {
        risk = 'medium';
        probability = 0.70;
      } else if (daysOverdue > 0) {
        risk = 'medium';
        probability = 0.85;
      }

      invoicesByRisk[risk].push({
        ...invoice,
        days_overdue: daysOverdue,
        collection_probability: probability
      });
    }

    // Expected collections
    const expectedCollections30d = unpaidInvoices
      .filter(inv => {
        const dueDate = inv.due_date ? new Date(inv.due_date) : null;
        return dueDate && dueDate <= thirtyDays;
      })
      .reduce((sum, inv) => {
        const daysOverdue = Math.floor((now - new Date(inv.due_date)) / (1000 * 60 * 60 * 24));
        const probability = daysOverdue > 60 ? 0.40 : daysOverdue > 30 ? 0.70 : 0.95;
        return sum + (inv.total * probability);
      }, 0);

    const expectedCollections60d = unpaidInvoices
      .filter(inv => {
        const dueDate = inv.due_date ? new Date(inv.due_date) : null;
        return dueDate && dueDate <= sixtyDays;
      })
      .reduce((sum, inv) => sum + (inv.total * 0.85), 0);

    const expectedCollections90d = unpaidInvoices
      .filter(inv => {
        const dueDate = inv.due_date ? new Date(inv.due_date) : null;
        return dueDate && dueDate <= ninetyDays;
      })
      .reduce((sum, inv) => sum + (inv.total * 0.80), 0);

    // Pending quote value
    const acceptedQuotes = quotes.filter(q => ['client_approved', 'ready_to_schedule'].includes(q.status));
    const pendingQuoteValue = acceptedQuotes.reduce((sum, q) => sum + (q.total || 0), 0);

    // AI-driven cashflow prediction using historical patterns
    const aiPrompt = `
Analyze the following financial data and provide cashflow predictions:

Current Outstanding: £${totalOutstanding.toLocaleString()}
Invoices at High Risk: ${invoicesByRisk.high.length} (£${invoicesByRisk.high.reduce((s, i) => s + i.total, 0).toLocaleString()})
Invoices at Medium Risk: ${invoicesByRisk.medium.length} (£${invoicesByRisk.medium.reduce((s, i) => s + i.total, 0).toLocaleString()})
Accepted Quotes (Pending Invoicing): £${pendingQuoteValue.toLocaleString()}

Historical Data:
- Total Invoices: ${invoices.length}
- Paid Invoices: ${invoices.filter(i => i.status === 'paid').length}
- Average Payment Time: ${invoices.filter(i => i.status === 'paid').length > 0 ? '~35 days' : 'N/A'}

Provide a JSON response with:
1. cashflow_30d: predicted cash inflow for next 30 days
2. cashflow_60d: predicted cash inflow for next 60 days
3. cashflow_90d: predicted cash inflow for next 90 days
4. risk_band: 'LOW', 'MEDIUM', or 'HIGH' based on overall collection risk
5. recommendations: array of 3 actionable recommendations

Consider seasonal patterns, client payment history, and current economic conditions.
`;

    const aiPrediction = await base44.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          cashflow_30d: { type: 'number' },
          cashflow_60d: { type: 'number' },
          cashflow_90d: { type: 'number' },
          risk_band: { type: 'string' },
          recommendations: { 
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    });

    console.log('🤖 AI Prediction:', aiPrediction);

    // Combine rule-based + AI predictions
    const forecast = {
      org_id: orgId,
      generated_at: now.toISOString(),
      cashflow_forecast: {
        next_30d: Math.round(Math.max(expectedCollections30d, aiPrediction.cashflow_30d || 0)),
        next_60d: Math.round(Math.max(expectedCollections60d, aiPrediction.cashflow_60d || 0)),
        next_90d: Math.round(Math.max(expectedCollections90d, aiPrediction.cashflow_90d || 0))
      },
      risk_analysis: {
        total_outstanding: Math.round(totalOutstanding),
        high_risk_value: Math.round(invoicesByRisk.high.reduce((s, i) => s + i.total, 0)),
        medium_risk_value: Math.round(invoicesByRisk.medium.reduce((s, i) => s + i.total, 0)),
        low_risk_value: Math.round(invoicesByRisk.low.reduce((s, i) => s + i.total, 0)),
        risk_band: aiPrediction.risk_band || 'MEDIUM'
      },
      collection_probability: {
        overall: Math.round((invoicesByRisk.low.length / (unpaidInvoices.length || 1)) * 100),
        high_risk_invoices: invoicesByRisk.high.length,
        medium_risk_invoices: invoicesByRisk.medium.length
      },
      recommendations: aiPrediction.recommendations || [
        'Follow up on overdue invoices immediately',
        'Consider payment plans for high-risk accounts',
        'Review credit terms for problematic clients'
      ]
    };

    // Publish to Redis for AI Accounts dashboard
    await publishToRedis(`accounts.org.${orgId}`, {
      type: 'cashflow_forecast_update',
      data: forecast,
      timestamp: now.toISOString()
    });

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: orgId,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'CashflowForecast',
      entity_id: `forecast-${Date.now()}`,
      new_values: {
        forecast_generated: true,
        risk_band: forecast.risk_analysis.risk_band
      }
    });

    console.log('✅ Financial forecast completed');

    return Response.json({
      success: true,
      ...forecast
    });

  } catch (error) {
    console.error('AI Financial Forecaster error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});