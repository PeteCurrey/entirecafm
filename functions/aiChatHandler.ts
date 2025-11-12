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

// Intent classification and routing
async function parseIntent(message, sessionContext, base44) {
  const lowerMessage = message.toLowerCase();
  
  // Keyword-based routing with context
  const intentMap = {
    director: ['health', 'sla', 'utilisation', 'utilization', 'engineer', 'capacity', 'breach', 'risk', 'org health'],
    accounts: ['invoice', 'payment', 'overdue', 'collection', 'debt', 'dunning', 'lpcd'],
    marketing: ['roi', 'conversion', 'lead', 'source', 'campaign', 'marketing', 'budget'],
    revenue: ['forecast', 'revenue', 'projection', 'margin', 'pipeline'],
    brief: ['brief', 'report', 'summary', 'executive'],
    action: ['generate', 'create', 'run', 'calculate', 'recalculate', 'send', 'trigger']
  };

  let detectedModule = sessionContext?.last_module || null;
  let isAction = false;

  // Check for module keywords
  for (const [module, keywords] of Object.entries(intentMap)) {
    if (keywords.some(kw => lowerMessage.includes(kw))) {
      if (module === 'action') {
        isAction = true;
      } else {
        detectedModule = module;
      }
    }
  }

  // Use LLM for complex intent parsing
  const intentPrompt = `
Classify the following user query for a facilities management AI assistant.

User message: "${message}"
Previous context: ${sessionContext?.last_module || 'none'}

Determine:
1. Intent type: QUERY (data retrieval) or ACTION (execute operation)
2. Module: director | accounts | marketing | revenue | brief | general
3. Specific metric/entity if applicable
4. Confidence (0.0-1.0)

Output JSON only.
`;

  const intentAnalysis = await base44.integrations.Core.InvokeLLM({
    prompt: intentPrompt,
    response_json_schema: {
      type: "object",
      properties: {
        intent_type: {
          type: "string",
          enum: ["QUERY", "ACTION", "CLARIFY"]
        },
        module: {
          type: "string"
        },
        specific_metric: {
          type: "string"
        },
        confidence: {
          type: "number"
        },
        needs_clarification: {
          type: "boolean"
        }
      }
    }
  });

  return {
    type: isAction ? 'ACTION' : intentAnalysis.intent_type,
    module: detectedModule || intentAnalysis.module,
    metric: intentAnalysis.specific_metric,
    confidence: intentAnalysis.confidence || 0.5,
    needs_clarification: intentAnalysis.needs_clarification || false
  };
}

// Generate response based on data
async function generateResponse(intent, data, base44) {
  const responsePrompt = `
You are an AI assistant for EntireCAFM, a facilities management platform.

User asked about: ${intent.module} - ${intent.metric || 'general query'}

Available data:
${JSON.stringify(data, null, 2)}

Generate a concise, executive-friendly response:
- Be direct and specific
- Include numbers and percentages
- Mention trends if available
- Suggest actions if relevant
- Keep it under 3 sentences

Output plain text only (no JSON).
`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt: responsePrompt
  });

  return typeof response === 'string' ? response : response.text || response.response || 'Data retrieved successfully.';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, session_id } = await req.json();

    if (!message) {
      return Response.json({ error: 'message required' }, { status: 400 });
    }

    const orgId = user.org_id || 'default-org';
    const startTime = Date.now();

    console.log(`💬 Processing message from ${user.email}: "${message}"`);

    // Get or create session
    let session;
    if (session_id) {
      const sessions = await base44.asServiceRole.entities.AISession.filter({ id: session_id });
      session = sessions[0];
      
      if (session) {
        await base44.asServiceRole.entities.AISession.update(session_id, {
          last_activity: new Date().toISOString()
        });
      }
    }

    if (!session) {
      session = await base44.asServiceRole.entities.AISession.create({
        org_id: orgId,
        user_id: user.id,
        session_started_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        active: true,
        context_memory: {}
      });
    }

    // Parse intent
    const intent = await parseIntent(message, session.context_memory, base44);
    
    console.log('🧠 Detected intent:', intent);

    // If clarification needed
    if (intent.needs_clarification || intent.confidence < 0.4) {
      const clarificationResponse = `I'm not quite sure what you're asking about. Could you rephrase? You can ask about:\n• Operations (SLA, utilisation, jobs)\n• Finances (invoices, payments, overdue)\n• Marketing (ROI, conversions, leads)\n• Revenue forecasts\n• Executive briefings`;
      
      await base44.asServiceRole.entities.AIConversation.create({
        org_id: orgId,
        user_id: user.id,
        session_id: session.id,
        message,
        response: clarificationResponse,
        context_tags: ['clarification'],
        confidence: 0.3
      });

      return Response.json({
        success: true,
        response: clarificationResponse,
        session_id: session.id,
        needs_clarification: true
      });
    }

    // Route to appropriate data source
    let data = {};
    let dataSources = [];
    let response = '';

    try {
      switch (intent.module) {
        case 'director': {
          const directorData = await base44.asServiceRole.functions.invoke('aiDirectorDashboard', { org_id: orgId });
          data = directorData.data;
          dataSources.push('aiDirectorDashboard');
          
          if (intent.metric?.includes('utilisation')) {
            response = `Average engineer utilisation is ${data.summary?.avg_engineer_utilisation || 0}% ` +
              `(${data.summary?.avg_engineer_utilisation >= 85 ? 'OVERLOADED' : data.summary?.avg_engineer_utilisation >= 70 ? 'BUSY' : 'OPTIMAL'} band). ` +
              `${data.summary?.at_risk_jobs || 0} jobs at SLA risk.`;
          } else if (intent.metric?.includes('sla')) {
            response = `${data.summary?.sla_breaches || 0} SLA breaches, ${data.summary?.at_risk_jobs || 0} jobs at risk. ` +
              `Organization health score is ${data.org_health_score || 0}/100.`;
          } else {
            response = await generateResponse(intent, data, base44);
          }
          break;
        }

        case 'accounts': {
          const invoices = await base44.asServiceRole.entities.Invoice.filter({ org_id: orgId });
          const overdueInvoices = invoices.filter(i => {
            if (i.status === 'paid') return false;
            return i.due_date && new Date(i.due_date) < new Date();
          });
          
          const overdueValue = overdueInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
          
          data = {
            overdue_count: overdueInvoices.length,
            overdue_value: overdueValue,
            top_overdue: overdueInvoices
              .sort((a, b) => (b.total || 0) - (a.total || 0))
              .slice(0, 5)
              .map(i => ({
                invoice_number: i.invoice_number,
                client_id: i.client_id,
                total: i.total,
                due_date: i.due_date
              }))
          };
          dataSources.push('Invoice');
          
          response = `You have ${overdueInvoices.length} overdue invoices totaling £${overdueValue.toLocaleString()}. ` +
            (overdueInvoices.length > 0 
              ? `Top overdue: Invoice #${overdueInvoices[0].invoice_number} (£${overdueInvoices[0].total?.toLocaleString()}).`
              : 'All invoices are current.');
          break;
        }

        case 'marketing': {
          const metrics = await base44.asServiceRole.entities.MarketingMetricsDaily.filter({ org_id: orgId });
          const recent = metrics
            .filter(m => new Date(m.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
            .sort((a, b) => b.date.localeCompare(a.date));
          
          const avgConversion = recent.length > 0
            ? recent.reduce((sum, m) => sum + (m.conversion_rate || 0), 0) / recent.length
            : 0;
          const avgROI = recent.length > 0
            ? recent.reduce((sum, m) => sum + (m.roi || 0), 0) / recent.length
            : 0;
          
          data = {
            conversion_rate: avgConversion,
            avg_roi: avgROI,
            leads: recent.reduce((sum, m) => sum + (m.leads || 0), 0),
            top_source: recent[0]?.top_source
          };
          dataSources.push('MarketingMetricsDaily');
          
          response = `Marketing performance (7 days): ${(avgConversion * 100).toFixed(1)}% conversion rate, ` +
            `${avgROI.toFixed(1)}× average ROI, ${data.leads} leads generated. ` +
            `Top source: ${data.top_source || 'N/A'}.`;
          break;
        }

        case 'revenue': {
          const projections = await base44.asServiceRole.entities.RevenueProjection.filter({ org_id: orgId });
          const latest = projections.sort((a, b) => 
            new Date(b.date_generated) - new Date(a.date_generated)
          )[0];
          
          data = latest || {};
          dataSources.push('RevenueProjection');
          
          if (latest) {
            response = `Revenue forecast: £${(latest.projection_30d || 0).toLocaleString()} (30 days), ` +
              `£${(latest.projection_90d || 0).toLocaleString()} (90 days). ` +
              `Expected margin: £${(latest.expected_margin || 0).toLocaleString()}. Risk: ${latest.risk_band || 'N/A'}.`;
          } else {
            response = 'No revenue forecast available yet. Generate one in AI Director or run the revenue simulator.';
          }
          break;
        }

        case 'brief': {
          const briefs = await base44.asServiceRole.entities.ExecutiveBrief.filter({ org_id: orgId });
          const latest = briefs.sort((a, b) => 
            b.week_commencing.localeCompare(a.week_commencing)
          )[0];
          
          data = latest || {};
          dataSources.push('ExecutiveBrief');
          
          if (latest) {
            response = `Latest executive brief (week ${latest.week_commencing}): ` +
              `Org health ${latest.org_health_score}/100, ` +
              `revenue £${(latest.forecast_summary_json?.projection_30d || 0).toLocaleString()}, ` +
              `${latest.risk_summary_json?.active_alerts || 0} active alerts. ` +
              `${latest.recommendations_json?.length || 0} recommendations generated.`;
          } else {
            response = 'No executive brief available. Generate one using "Generate executive brief" command.';
          }
          break;
        }

        default: {
          // General query - use LLM with context
          response = await generateResponse(intent, { message }, base44);
        }
      }

      // Handle ACTION intent
      if (intent.type === 'ACTION') {
        console.log('⚡ Executing action...');
        
        const actionResult = await base44.asServiceRole.functions.invoke('aiCommandExecutor', {
          org_id: orgId,
          user_id: user.id,
          command: message,
          intent
        });

        if (actionResult.data?.success) {
          response = actionResult.data.message || 'Action completed successfully.';
          data = actionResult.data;
        } else {
          response = 'Action failed. Please try again or contact support.';
        }
        
        dataSources.push('aiCommandExecutor');
      }

    } catch (dataError) {
      console.error('Data fetch error:', dataError);
      response = 'I encountered an error retrieving that information. Please try again.';
    }

    // Update session context
    await base44.asServiceRole.entities.AISession.update(session.id, {
      last_activity: new Date().toISOString(),
      context_memory: {
        ...session.context_memory,
        last_module: intent.module,
        last_query: message
      }
    });

    // Log conversation
    const conversation = await base44.asServiceRole.entities.AIConversation.create({
      org_id: orgId,
      user_id: user.id,
      session_id: session.id,
      message,
      response,
      context_tags: [intent.module, intent.type].filter(Boolean),
      confidence: intent.confidence,
      intent: intent.type,
      data_sources: dataSources
    });

    // Publish to Redis
    await publishToRedis(`chat.org.${orgId}`, {
      type: 'message_processed',
      user_id: user.id,
      session_id: session.id,
      module: intent.module,
      timestamp: new Date().toISOString()
    });

    const executionTime = Date.now() - startTime;
    console.log(`✅ Response generated in ${executionTime}ms`);

    return Response.json({
      success: true,
      response,
      session_id: session.id,
      intent: intent.type,
      module: intent.module,
      confidence: intent.confidence,
      execution_time_ms: executionTime,
      data_sources: dataSources
    });

  } catch (error) {
    console.error('aiChatHandler error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});