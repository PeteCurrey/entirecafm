import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
const SLACK_WEBHOOK_EXEC = Deno.env.get('SLACK_WEBHOOK_EXEC');

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

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function generateHTMLReport(briefData) {
  const { 
    week_commencing, 
    org_health_score,
    financial_summary_json: financials = {},
    operational_summary_json: ops = {},
    marketing_summary_json: marketing = {},
    forecast_summary_json: forecast = {},
    risk_summary_json: risks = {},
    recommendations_json: recommendations = []
  } = briefData;

  const healthColor = org_health_score >= 80 ? '#10B981' : org_health_score >= 60 ? '#F59E0B' : '#EF4444';
  const riskColor = risks.risk_score >= 70 ? '#EF4444' : risks.risk_score >= 40 ? '#F59E0B' : '#10B981';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Executive Briefing - ${week_commencing}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, system-ui, sans-serif;
      background: #0D1117;
      color: #CED4DA;
      padding: 40px;
    }
    .container { max-width: 900px; margin: 0 auto; background: #161B22; padding: 40px; border-radius: 12px; }
    .header {
      border-bottom: 3px solid #E1467C;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 5px;
    }
    .header .subtitle {
      color: #CED4DA;
      font-size: 14px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #FFFFFF;
      margin-bottom: 15px;
      border-left: 4px solid #E1467C;
      padding-left: 12px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 15px;
    }
    .kpi-label {
      font-size: 11px;
      color: #8B949E;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .kpi-value {
      font-size: 28px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 4px;
    }
    .kpi-delta {
      font-size: 12px;
      font-weight: 600;
    }
    .delta-up { color: #10B981; }
    .delta-down { color: #EF4444; }
    .delta-neutral { color: #8B949E; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-success { background: rgba(16, 185, 129, 0.2); color: #10B981; }
    .badge-warning { background: rgba(245, 158, 11, 0.2); color: #F59E0B; }
    .badge-danger { background: rgba(239, 68, 68, 0.2); color: #EF4444; }
    .recommendation-list {
      list-style: none;
    }
    .recommendation-list li {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 12px 15px;
      margin-bottom: 10px;
      display: flex;
      align-items: start;
      gap: 12px;
    }
    .recommendation-icon {
      font-size: 18px;
      flex-shrink: 0;
    }
    .recommendation-text {
      flex: 1;
      color: #FFFFFF;
      font-size: 14px;
    }
    .recommendation-confidence {
      font-size: 11px;
      color: #8B949E;
    }
    .alert-item {
      background: rgba(239, 68, 68, 0.1);
      border-left: 3px solid #EF4444;
      padding: 10px 15px;
      margin-bottom: 8px;
      border-radius: 6px;
    }
    .alert-title {
      font-size: 13px;
      font-weight: 600;
      color: #EF4444;
      margin-bottom: 3px;
    }
    .alert-desc {
      font-size: 12px;
      color: #CED4DA;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      text-align: center;
      font-size: 11px;
      color: #8B949E;
    }
    .trend-arrow { font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏢 ENTIRECAFM</h1>
      <h2 style="color: #E1467C; font-size: 24px; margin: 10px 0;">Executive AI Briefing</h2>
      <div class="subtitle">Week Commencing: ${week_commencing}</div>
      <div class="subtitle">Generated: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>

    <!-- SNAPSHOT KPIs -->
    <div class="section">
      <div class="section-title">📊 Key Performance Indicators</div>
      <div class="kpi-grid">
        <div class="kpi-card" style="border-color: ${healthColor};">
          <div class="kpi-label">Org Health</div>
          <div class="kpi-value" style="color: ${healthColor};">${org_health_score}</div>
          <div class="kpi-delta ${ops.delta_pct > 0 ? 'delta-up' : ops.delta_pct < 0 ? 'delta-down' : 'delta-neutral'}">
            ${ops.delta_pct > 0 ? '↑' : ops.delta_pct < 0 ? '↓' : '→'} ${Math.abs(ops.delta_pct || 0).toFixed(1)}% WoW
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">SLA Breaches</div>
          <div class="kpi-value" style="color: ${ops.sla_breaches > 0 ? '#EF4444' : '#10B981'};">${ops.sla_breaches || 0}</div>
          <div class="kpi-delta ${ops.sla_delta > 0 ? 'delta-down' : ops.sla_delta < 0 ? 'delta-up' : 'delta-neutral'}">
            ${ops.sla_delta > 0 ? '↑' : ops.sla_delta < 0 ? '↓' : '→'} ${Math.abs(ops.sla_delta || 0)} WoW
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Utilisation</div>
          <div class="kpi-value">${ops.avg_utilisation || 0}%</div>
          <div class="kpi-delta ${ops.utilisation_delta > 0 ? 'delta-up' : ops.utilisation_delta < 0 ? 'delta-down' : 'delta-neutral'}">
            ${ops.utilisation_delta > 0 ? '↑' : ops.utilisation_delta < 0 ? '↓' : '→'} ${Math.abs(ops.utilisation_delta || 0).toFixed(1)}% WoW
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">30-Day Revenue</div>
          <div class="kpi-value">£${(forecast.projection_30d || 0).toLocaleString()}</div>
          <span class="badge badge-${forecast.risk_band === 'LOW' ? 'success' : forecast.risk_band === 'MED' ? 'warning' : 'danger'}">${forecast.risk_band || 'N/A'} Risk</span>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Overdue Invoices</div>
          <div class="kpi-value" style="color: #EF4444;">£${(financials.overdue_value || 0).toLocaleString()}</div>
          <div class="kpi-delta ${financials.delta_pct < 0 ? 'delta-up' : financials.delta_pct > 0 ? 'delta-down' : 'delta-neutral'}">
            ${financials.delta_pct > 0 ? '↑' : financials.delta_pct < 0 ? '↓' : '→'} ${Math.abs(financials.delta_pct || 0).toFixed(1)}% WoW
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Marketing ROI</div>
          <div class="kpi-value">${(marketing.roi || 0).toFixed(1)}×</div>
          <div class="kpi-delta ${marketing.delta_pct > 0 ? 'delta-up' : marketing.delta_pct < 0 ? 'delta-down' : 'delta-neutral'}">
            ${marketing.delta_pct > 0 ? '↑' : marketing.delta_pct < 0 ? '↓' : '→'} ${Math.abs(marketing.delta_pct || 0).toFixed(1)}% WoW
          </div>
        </div>
      </div>
    </div>

    <!-- ALERTS & RISKS -->
    <div class="section">
      <div class="section-title">⚠️ Alerts & Risk Events</div>
      ${risks.critical_issues?.length > 0 ? risks.critical_issues.slice(0, 5).map(issue => `
        <div class="alert-item">
          <div class="alert-title">${issue.title}</div>
          <div class="alert-desc">${issue.description}</div>
        </div>
      `).join('') : '<p style="color: #10B981;">✅ No critical alerts this week</p>'}
      
      <div style="margin-top: 15px; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px;">
        <strong style="color: ${riskColor};">Overall Risk Score: ${risks.risk_score || 0}/100</strong>
      </div>
    </div>

    <!-- RECOMMENDATIONS -->
    <div class="section">
      <div class="section-title">🎯 AI Recommendations</div>
      <ul class="recommendation-list">
        ${recommendations.slice(0, 8).map(rec => `
          <li>
            <span class="recommendation-icon">${
              rec.priority === 'urgent' ? '🔴' :
              rec.priority === 'high' ? '🟠' :
              rec.priority === 'medium' ? '🟡' :
              '🟢'
            }</span>
            <div>
              <div class="recommendation-text">${rec.action}</div>
              <div class="recommendation-confidence">Confidence: ${Math.round((rec.confidence || 0) * 100)}% | Category: ${rec.category}</div>
            </div>
          </li>
        `).join('')}
      </ul>
    </div>

    <!-- FINANCIAL SUMMARY -->
    <div class="section">
      <div class="section-title">💷 Financial Performance</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div>
          <div style="font-size: 12px; color: #8B949E; margin-bottom: 5px;">Overdue Invoices</div>
          <div style="font-size: 24px; font-weight: 700; color: #EF4444;">£${(financials.overdue_value || 0).toLocaleString()}</div>
          <div style="font-size: 12px; color: #CED4DA;">${financials.overdue_count || 0} invoices</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #8B949E; margin-bottom: 5px;">Expected Collections</div>
          <div style="font-size: 24px; font-weight: 700; color: #10B981;">£${(financials.collections_expected || 0).toLocaleString()}</div>
          <div style="font-size: 12px; color: #CED4DA;">Next 30 days</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #8B949E; margin-bottom: 5px;">Unbilled (Approved)</div>
          <div style="font-size: 24px; font-weight: 700; color: #F59E0B;">£${(financials.unbilled_value || 0).toLocaleString()}</div>
          <div style="font-size: 12px; color: #CED4DA;">Ready to invoice</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #8B949E; margin-bottom: 5px;">Expected Margin</div>
          <div style="font-size: 24px; font-weight: 700; color: #10B981;">£${(forecast.expected_margin || 0).toLocaleString()}</div>
          <div style="font-size: 12px; color: #CED4DA;">AI-optimised</div>
        </div>
      </div>
    </div>

    <!-- MARKETING PERFORMANCE -->
    <div class="section">
      <div class="section-title">📢 Marketing Performance</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
        <div>
          <div style="font-size: 12px; color: #8B949E;">Leads (7d)</div>
          <div style="font-size: 20px; font-weight: 700; color: #FFFFFF;">${marketing.leads || 0}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #8B949E;">Conversion Rate</div>
          <div style="font-size: 20px; font-weight: 700; color: #FFFFFF;">${((marketing.conversion_rate || 0) * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #8B949E;">Top Source</div>
          <div style="font-size: 14px; font-weight: 600; color: #FFFFFF;">${marketing.top_source || 'N/A'}</div>
          <div style="font-size: 12px; color: #10B981;">ROI: ${marketing.roi?.toFixed(1) || 0}×</div>
        </div>
      </div>
    </div>

    <div class="footer">
      Generated automatically by <strong style="color: #E1467C;">EntireCAFM AI Operations Layer</strong><br>
      ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { org_id } = await req.json();

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    console.log(`📊 Generating executive brief for org ${org_id}`);

    const weekCommencing = getMonday();
    const weekCommencingStr = weekCommencing.toISOString().split('T')[0];

    // Get previous week's brief for delta calculation
    const lastMonday = getMonday(new Date(weekCommencing.getTime() - 7 * 24 * 60 * 60 * 1000));
    const lastWeekStr = lastMonday.toISOString().split('T')[0];

    const previousBriefs = await base44.asServiceRole.entities.ExecutiveBrief.filter({
      org_id,
      week_commencing: lastWeekStr
    });
    const previousBrief = previousBriefs.length > 0 ? previousBriefs[0] : null;

    // Step 1: Aggregate data from all AI modules
    console.log('📥 Fetching data from AI modules...');

    const [directorData, revenueProjections, recipients] = await Promise.all([
      base44.asServiceRole.functions.invoke('aiDirectorDashboard', { org_id })
        .then(r => r.data)
        .catch(e => { console.error('Director dashboard error:', e); return {}; }),
      
      base44.asServiceRole.entities.RevenueProjection.filter({ org_id }),
      
      base44.asServiceRole.entities.ExecutiveRecipient.filter({ 
        org_id,
        active: true
      })
    ]);

    const latestRevenueForecast = revenueProjections
      .sort((a, b) => new Date(b.date_generated) - new Date(a.date_generated))[0];

    // Fetch marketing & accounts data
    const [marketingMetrics, leadSources, paymentScores] = await Promise.all([
      base44.asServiceRole.entities.MarketingMetricsDaily.filter({ org_id }),
      base44.asServiceRole.entities.LeadSource.filter({ org_id }),
      base44.asServiceRole.entities.PaymentScore.filter({ org_id })
    ]);

    // Calculate 7-day marketing summary
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentMarketingMetrics = marketingMetrics
      .filter(m => new Date(m.date) >= sevenDaysAgo)
      .sort((a, b) => b.date.localeCompare(a.date));

    const marketingSummary = {
      leads: recentMarketingMetrics.reduce((sum, m) => sum + (m.leads || 0), 0),
      conversion_rate: recentMarketingMetrics.length > 0
        ? recentMarketingMetrics.reduce((sum, m) => sum + (m.conversion_rate || 0), 0) / recentMarketingMetrics.length
        : 0,
      roi: recentMarketingMetrics.length > 0
        ? recentMarketingMetrics.reduce((sum, m) => sum + (m.roi || 0), 0) / recentMarketingMetrics.length
        : 0,
      top_source: recentMarketingMetrics[0]?.top_source || 'N/A',
      delta_pct: 0 // TODO: Calculate from previous week
    };

    // Step 2: Calculate week-on-week deltas
    const operationalSummary = {
      sla_breaches: directorData?.summary?.sla_breaches || 0,
      at_risk_jobs: directorData?.summary?.at_risk_jobs || 0,
      avg_utilisation: directorData?.summary?.avg_engineer_utilisation || 0,
      completed_jobs: directorData?.summary?.completed_jobs || 0,
      delta_pct: previousBrief 
        ? ((directorData?.org_health_score || 0) - (previousBrief.org_health_score || 0)) / (previousBrief.org_health_score || 1) * 100
        : 0,
      sla_delta: previousBrief
        ? (directorData?.summary?.sla_breaches || 0) - (previousBrief.operational_summary_json?.sla_breaches || 0)
        : 0,
      utilisation_delta: previousBrief
        ? (directorData?.summary?.avg_engineer_utilisation || 0) - (previousBrief.operational_summary_json?.avg_utilisation || 0)
        : 0
    };

    const financialSummary = {
      overdue_value: directorData?.financials?.outstanding_invoices?.overdue_value || 0,
      overdue_count: directorData?.financials?.outstanding_invoices?.overdue_count || 0,
      unbilled_value: directorData?.financials?.unbilled_quotes?.approved_unbilled || 0,
      collections_expected: latestRevenueForecast?.expected_collections || 0,
      delta_pct: previousBrief
        ? ((financialSummary.overdue_value) - (previousBrief.financial_summary_json?.overdue_value || 0)) / (previousBrief.financial_summary_json?.overdue_value || 1) * 100
        : 0
    };

    const forecastSummary = {
      projection_30d: latestRevenueForecast?.projection_30d || 0,
      projection_90d: latestRevenueForecast?.projection_90d || 0,
      expected_margin: latestRevenueForecast?.expected_margin || 0,
      risk_band: latestRevenueForecast?.risk_band || 'N/A'
    };

    // Step 3: Generate AI recommendations
    console.log('🧠 Generating AI recommendations...');
    
    const recommendationsPrompt = `
You are an AI business analyst for a facilities management company.

Analyze the following weekly performance data and generate 5-8 actionable recommendations for executives.

PERFORMANCE DATA:
- Org Health: ${directorData?.org_health_score || 0}/100 (WoW: ${operationalSummary.delta_pct > 0 ? '+' : ''}${operationalSummary.delta_pct.toFixed(1)}%)
- SLA Breaches: ${operationalSummary.sla_breaches} (Change: ${operationalSummary.sla_delta > 0 ? '+' : ''}${operationalSummary.sla_delta})
- Avg Utilisation: ${operationalSummary.avg_utilisation}% (Change: ${operationalSummary.utilisation_delta > 0 ? '+' : ''}${operationalSummary.utilisation_delta.toFixed(1)}%)
- Overdue Invoices: £${financialSummary.overdue_value.toLocaleString()} (${financialSummary.overdue_count} invoices)
- 30-Day Revenue Forecast: £${forecastSummary.projection_30d.toLocaleString()}
- Marketing ROI: ${marketingSummary.roi.toFixed(1)}× (Conv: ${(marketingSummary.conversion_rate * 100).toFixed(1)}%)

REQUIREMENTS:
- Prioritize actions by impact (urgent > high > medium > low)
- Be specific and actionable (e.g., "Escalate £18k overdue from Acme Ltd to collections")
- Include confidence level (0.0 - 1.0)
- Category: Operations, Finance, Marketing, or Strategic
- Max 8 recommendations

Focus on:
- Issues with negative trends
- High-value opportunities
- Risk mitigation
`;

    const aiRecommendations = await base44.integrations.Core.InvokeLLM({
      prompt: recommendationsPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: {
                  type: "string",
                  enum: ["urgent", "high", "medium", "low"]
                },
                action: {
                  type: "string"
                },
                confidence: {
                  type: "number"
                },
                category: {
                  type: "string",
                  enum: ["Operations", "Finance", "Marketing", "Strategic"]
                }
              }
            }
          }
        }
      }
    });

    // Step 4: Compile risk summary
    const riskSummary = {
      total_alerts: (operationalSummary.sla_breaches || 0) + 
                    (financialSummary.overdue_count || 0) +
                    (directorData?.summary?.at_risk_jobs || 0),
      critical_issues: [
        ...(operationalSummary.sla_breaches > 0 ? [{
          title: `${operationalSummary.sla_breaches} SLA Breach${operationalSummary.sla_breaches > 1 ? 'es' : ''}`,
          description: `${operationalSummary.at_risk_jobs} jobs at risk of missing SLA targets`,
          severity: 'high'
        }] : []),
        ...(financialSummary.overdue_value > 10000 ? [{
          title: `£${financialSummary.overdue_value.toLocaleString()} Overdue`,
          description: `${financialSummary.overdue_count} invoices require collection action`,
          severity: 'high'
        }] : []),
        ...(operationalSummary.avg_utilisation >= 85 ? [{
          title: 'Engineer Capacity Critical',
          description: `Average utilisation ${operationalSummary.avg_utilisation}% - resource shortage`,
          severity: 'medium'
        }] : [])
      ],
      risk_score: Math.max(0, 100 - 
        (operationalSummary.sla_breaches * 10) -
        (financialSummary.overdue_count * 5) -
        (operationalSummary.avg_utilisation >= 85 ? 15 : 0)
      )
    };

    // Step 5: Generate HTML
    const briefData = {
      week_commencing: weekCommencingStr,
      org_health_score: directorData?.org_health_score || 0,
      financial_summary_json: financialSummary,
      operational_summary_json: operationalSummary,
      marketing_summary_json: marketingSummary,
      forecast_summary_json: forecastSummary,
      risk_summary_json: riskSummary,
      recommendations_json: aiRecommendations.recommendations || []
    };

    const htmlContent = generateHTMLReport(briefData);

    // Step 6: Upload HTML as file (instead of PDF - simpler for now)
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    const htmlFile = new File([htmlBlob], `exec-brief-${weekCommencingStr}.html`, { type: 'text/html' });
    
    const uploadResult = await base44.integrations.Core.UploadFile({ file: htmlFile });
    const reportUrl = uploadResult.file_url;

    console.log(`✅ Report uploaded: ${reportUrl}`);

    // Step 7: Save executive brief record
    const brief = await base44.asServiceRole.entities.ExecutiveBrief.create({
      ...briefData,
      org_id,
      generated_at: new Date().toISOString(),
      pdf_url: reportUrl,
      distributed_to: recipients.map(r => r.email),
      created_by_ai: true
    });

    // Step 8: Distribute to recipients
    console.log(`📧 Distributing to ${recipients.length} recipients...`);
    
    for (const recipient of recipients) {
      if (recipient.preferred_channel === 'email') {
        try {
          await base44.integrations.Core.SendEmail({
            to: recipient.email,
            subject: `Executive Briefing - Week Commencing ${weekCommencingStr}`,
            body: `
Dear ${recipient.name},

Your weekly EntireCAFM Executive AI Briefing is ready.

📊 Key Highlights:
• Org Health: ${directorData?.org_health_score || 0}/100
• 30-Day Revenue Forecast: £${(forecastSummary.projection_30d || 0).toLocaleString()}
• Overdue Invoices: £${financialSummary.overdue_value.toLocaleString()}
• Marketing ROI: ${marketingSummary.roi.toFixed(1)}×

View full report: ${reportUrl}

Top Recommendations:
${aiRecommendations.recommendations?.slice(0, 3).map((r, i) => 
  `${i + 1}. ${r.action}`
).join('\n')}

---
Generated automatically by EntireCAFM AI Operations Layer
            `
          });
          console.log(`✅ Email sent to ${recipient.email}`);
        } catch (error) {
          console.error(`Failed to email ${recipient.email}:`, error);
        }
      }
    }

    // Slack notification
    if (SLACK_WEBHOOK_EXEC) {
      try {
        await fetch(SLACK_WEBHOOK_EXEC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `📊 *Executive Brief Ready - W/C ${weekCommencingStr}*\n\n` +
                  `Org Health: ${directorData?.org_health_score}/100 | ` +
                  `30d Revenue: £${(forecastSummary.projection_30d || 0).toLocaleString()} | ` +
                  `Risk: ${forecastSummary.risk_band}\n\n` +
                  `View full brief: ${reportUrl}`
          })
        });
        console.log('✅ Slack notification sent');
      } catch (error) {
        console.error('Slack notification failed:', error);
      }
    }

    // Publish to Redis
    await publishToRedis(`executive.org.${org_id}`, {
      type: 'brief_generated',
      week_commencing: weekCommencingStr,
      brief_id: brief.id,
      org_health: directorData?.org_health_score || 0,
      timestamp: new Date().toISOString()
    });

    await publishToRedis(`director.org.${org_id}`, {
      type: 'executive_brief_available',
      brief_id: brief.id,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Executive brief generated: ${brief.id}`);

    return Response.json({
      success: true,
      brief_id: brief.id,
      week_commencing: weekCommencingStr,
      report_url: reportUrl,
      distributed_to: recipients.length,
      recommendations_count: aiRecommendations.recommendations?.length || 0
    });

  } catch (error) {
    console.error('aiGenerateExecutiveBrief error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});