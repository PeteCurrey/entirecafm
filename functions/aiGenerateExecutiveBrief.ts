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

async function postToSlack(message) {
  if (!SLACK_WEBHOOK_EXEC) return;

  try {
    await fetch(SLACK_WEBHOOK_EXEC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });
  } catch (error) {
    console.error('Slack post error:', error);
  }
}

function getWeekCommencing(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function generateHTMLReport(briefData) {
  const {
    week_commencing,
    org_health_score,
    financial_summary_json,
    operational_summary_json,
    marketing_summary_json,
    forecast_summary_json,
    risk_summary_json,
    recommendations_json
  } = briefData;

  const healthColor = org_health_score >= 80 ? '#10B981' : org_health_score >= 60 ? '#F59E0B' : '#EF4444';
  const healthLabel = org_health_score >= 80 ? 'HEALTHY' : org_health_score >= 60 ? 'NEEDS ATTENTION' : 'CRITICAL';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: #0D1117; 
      color: #CED4DA;
      padding: 40px;
    }
    .container { max-width: 900px; margin: 0 auto; background: #161B22; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #E1467C 0%, #C13666 100%); padding: 40px; color: white; }
    .header h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .content { padding: 40px; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 18px; font-weight: 600; color: white; margin-bottom: 16px; border-bottom: 2px solid #E1467C; padding-bottom: 8px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; }
    .kpi-label { font-size: 12px; color: #CED4DA; margin-bottom: 8px; text-transform: uppercase; }
    .kpi-value { font-size: 28px; font-weight: 700; color: white; margin-bottom: 4px; }
    .kpi-delta { font-size: 12px; font-weight: 600; }
    .delta-up { color: #10B981; }
    .delta-down { color: #EF4444; }
    .delta-neutral { color: #CED4DA; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .badge-green { background: rgba(16, 185, 129, 0.2); color: #10B981; }
    .badge-yellow { background: rgba(245, 158, 11, 0.2); color: #F59E0B; }
    .badge-red { background: rgba(239, 68, 68, 0.2); color: #EF4444; }
    .risk-item { background: rgba(239, 68, 68, 0.1); border-left: 3px solid #EF4444; padding: 12px; margin-bottom: 8px; border-radius: 6px; }
    .rec-item { background: rgba(225, 70, 124, 0.1); border-left: 3px solid #E1467C; padding: 12px; margin-bottom: 8px; border-radius: 6px; }
    .rec-title { font-weight: 600; color: white; margin-bottom: 4px; }
    .rec-desc { font-size: 13px; color: #CED4DA; }
    .footer { text-align: center; padding: 24px; border-top: 1px solid rgba(255,255,255,0.08); color: #6B7280; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    th { font-size: 12px; color: #CED4DA; text-transform: uppercase; font-weight: 600; }
    td { font-size: 14px; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ENTIRECAFM – Executive AI Briefing</h1>
      <p>Week Commencing: ${new Date(week_commencing).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p>Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    </div>

    <div class="content">
      <!-- SNAPSHOT KPIs -->
      <div class="section">
        <h2 class="section-title">📊 Snapshot KPIs</h2>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Org Health</div>
            <div class="kpi-value" style="color: ${healthColor}">${org_health_score || 0}</div>
            <span class="badge" style="background-color: ${healthColor}33; color: ${healthColor}">${healthLabel}</span>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">SLA Breaches</div>
            <div class="kpi-value">${operational_summary_json?.sla_breaches || 0}</div>
            ${operational_summary_json?.delta_sla_pct ? `
              <div class="kpi-delta ${operational_summary_json.delta_sla_pct > 0 ? 'delta-up' : 'delta-down'}">
                ${operational_summary_json.delta_sla_pct > 0 ? '↑' : '↓'} ${Math.abs(operational_summary_json.delta_sla_pct).toFixed(0)}%
              </div>
            ` : ''}
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Utilisation</div>
            <div class="kpi-value">${operational_summary_json?.avg_utilisation || 0}%</div>
            <span class="badge ${
              (operational_summary_json?.avg_utilisation || 0) >= 85 ? 'badge-red' :
              (operational_summary_json?.avg_utilisation || 0) >= 70 ? 'badge-yellow' :
              'badge-green'
            }">
              ${(operational_summary_json?.avg_utilisation || 0) >= 85 ? 'OVERLOADED' :
                (operational_summary_json?.avg_utilisation || 0) >= 70 ? 'BUSY' :
                'OPTIMAL'}
            </span>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Overdue Invoices</div>
            <div class="kpi-value" style="color: #EF4444">£${(financial_summary_json?.overdue_value || 0).toLocaleString()}</div>
            <div class="kpi-delta">${financial_summary_json?.overdue_count || 0} invoices</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Revenue (30d)</div>
            <div class="kpi-value">£${(forecast_summary_json?.projection_30d || 0).toLocaleString()}</div>
            <span class="badge ${
              forecast_summary_json?.risk_band === 'LOW' ? 'badge-green' :
              forecast_summary_json?.risk_band === 'MED' ? 'badge-yellow' :
              'badge-red'
            }">
              ${forecast_summary_json?.risk_band || 'N/A'} RISK
            </span>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Marketing ROI</div>
            <div class="kpi-value">${(marketing_summary_json?.avg_roi || 0).toFixed(1)}×</div>
            <div class="kpi-delta">${marketing_summary_json?.conversion_rate ? (marketing_summary_json.conversion_rate * 100).toFixed(0) : 0}% conv</div>
          </div>
        </div>
      </div>

      <!-- ALERTS & RISKS -->
      <div class="section">
        <h2 class="section-title">⚠️ Alerts & Risk Flags</h2>
        ${risk_summary_json?.top_risks?.length > 0 ? `
          ${risk_summary_json.top_risks.map(risk => `
            <div class="risk-item">
              <strong style="color: #EF4444">${risk.title}</strong><br>
              <span style="font-size: 13px">${risk.description}</span>
            </div>
          `).join('')}
        ` : '<p style="color: #10B981">✅ No critical risks detected</p>'}
      </div>

      <!-- AI RECOMMENDATIONS -->
      <div class="section">
        <h2 class="section-title">💡 AI Recommendations</h2>
        ${recommendations_json?.length > 0 ? `
          ${recommendations_json.map(rec => `
            <div class="rec-item">
              <div class="rec-title">${rec.title}</div>
              <div class="rec-desc">${rec.description}</div>
              ${rec.confidence ? `<span class="badge badge-green" style="margin-top: 6px; display: inline-block">${Math.round(rec.confidence * 100)}% Confidence</span>` : ''}
            </div>
          `).join('')}
        ` : '<p>No recommendations at this time</p>'}
      </div>

      <!-- OPERATIONAL DETAIL -->
      <div class="section">
        <h2 class="section-title">⚙️ Operational Detail</h2>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Current</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Active Jobs</td>
              <td>${operational_summary_json?.active_jobs || 0}</td>
              <td><span class="badge badge-green">TRACKING</span></td>
            </tr>
            <tr>
              <td>At-Risk Jobs</td>
              <td>${operational_summary_json?.at_risk_jobs || 0}</td>
              <td><span class="badge ${(operational_summary_json?.at_risk_jobs || 0) > 5 ? 'badge-red' : 'badge-yellow'}">
                ${(operational_summary_json?.at_risk_jobs || 0) > 5 ? 'URGENT' : 'MONITOR'}
              </span></td>
            </tr>
            <tr>
              <td>Avg Utilisation (48h)</td>
              <td>${operational_summary_json?.avg_utilisation || 0}%</td>
              <td><span class="badge ${
                (operational_summary_json?.avg_utilisation || 0) >= 85 ? 'badge-red' :
                (operational_summary_json?.avg_utilisation || 0) >= 70 ? 'badge-yellow' :
                'badge-green'
              }">
                ${(operational_summary_json?.avg_utilisation || 0) >= 85 ? 'OVERLOADED' : 
                  (operational_summary_json?.avg_utilisation || 0) >= 70 ? 'BUSY' : 'OPTIMAL'}
              </span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FINANCIAL DETAIL -->
      <div class="section">
        <h2 class="section-title">💷 Financial Detail</h2>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Overdue Invoices</td>
              <td>£${(financial_summary_json?.overdue_value || 0).toLocaleString()}</td>
              <td><span class="badge ${(financial_summary_json?.overdue_value || 0) > 20000 ? 'badge-red' : 'badge-yellow'}">
                ${(financial_summary_json?.overdue_count || 0)} invoices
              </span></td>
            </tr>
            <tr>
              <td>Unbilled Quotes</td>
              <td>£${(financial_summary_json?.unbilled_value || 0).toLocaleString()}</td>
              <td><span class="badge badge-yellow">ACTION REQUIRED</span></td>
            </tr>
            <tr>
              <td>Collection Probability</td>
              <td>${Math.round((financial_summary_json?.collection_prob || 0) * 100)}%</td>
              <td><span class="badge ${
                (financial_summary_json?.collection_prob || 0) >= 0.9 ? 'badge-green' :
                (financial_summary_json?.collection_prob || 0) >= 0.7 ? 'badge-yellow' :
                'badge-red'
              }">
                ${(financial_summary_json?.collection_prob || 0) >= 0.9 ? 'LOW RISK' :
                  (financial_summary_json?.collection_prob || 0) >= 0.7 ? 'MED RISK' : 'HIGH RISK'}
              </span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FORECAST -->
      <div class="section">
        <h2 class="section-title">📈 Revenue Forecast</h2>
        <div class="kpi-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div class="kpi-card">
            <div class="kpi-label">30-Day Projection</div>
            <div class="kpi-value">£${(forecast_summary_json?.projection_30d || 0).toLocaleString()}</div>
            <span class="badge ${
              forecast_summary_json?.risk_band === 'LOW' ? 'badge-green' :
              forecast_summary_json?.risk_band === 'MED' ? 'badge-yellow' :
              'badge-red'
            }">${forecast_summary_json?.risk_band || 'N/A'} RISK</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">90-Day Projection</div>
            <div class="kpi-value">£${(forecast_summary_json?.projection_90d || 0).toLocaleString()}</div>
            <div class="kpi-delta">Expected margin: £${(forecast_summary_json?.expected_margin || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <!-- MARKETING -->
      <div class="section">
        <h2 class="section-title">📣 Marketing Performance</h2>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Conversion Rate</td>
              <td>${marketing_summary_json?.conversion_rate ? (marketing_summary_json.conversion_rate * 100).toFixed(1) : 0}%</td>
              <td>${marketing_summary_json?.delta_conversion_pct ? `
                <span class="${marketing_summary_json.delta_conversion_pct >= 0 ? 'delta-up' : 'delta-down'}">
                  ${marketing_summary_json.delta_conversion_pct >= 0 ? '↑' : '↓'} ${Math.abs(marketing_summary_json.delta_conversion_pct).toFixed(0)}%
                </span>
              ` : '—'}</td>
            </tr>
            <tr>
              <td>Average ROI</td>
              <td>${(marketing_summary_json?.avg_roi || 0).toFixed(1)}×</td>
              <td>—</td>
            </tr>
            <tr>
              <td>Leads Generated</td>
              <td>${marketing_summary_json?.leads || 0}</td>
              <td>—</td>
            </tr>
            <tr>
              <td>Top Source</td>
              <td>${marketing_summary_json?.top_source || 'N/A'}</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer">
      Generated automatically by ENTIRECAFM AI Operations Layer<br>
      Powered by Base44 Intelligence Engine
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

    const weekCommencing = getWeekCommencing(new Date());

    // Check if brief already exists for this week
    const existing = await base44.asServiceRole.entities.ExecutiveBrief.filter({
      org_id,
      week_commencing: weekCommencing
    });

    if (existing.length > 0) {
      console.log('ℹ️  Brief already exists for this week, regenerating...');
    }

    // Step 1: Pull data from all AI dashboards
    console.log('📥 Fetching dashboard data...');
    
    const [directorResult, revenueResult] = await Promise.all([
      base44.asServiceRole.functions.invoke('aiDirectorDashboard', { org_id }),
      base44.asServiceRole.functions.invoke('revenueSimulator', { org_id }).catch(() => ({ data: null }))
    ]);

    const directorData = directorResult.data;
    const revenueData = revenueResult.data?.projection;

    // Fetch marketing metrics
    const marketingMetrics = await base44.asServiceRole.entities.MarketingMetricsDaily.filter({ org_id });
    const last7Days = marketingMetrics
      .filter(m => new Date(m.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .sort((a, b) => b.date.localeCompare(a.date));

    const avgConversion = last7Days.length > 0
      ? last7Days.reduce((sum, m) => sum + (m.conversion_rate || 0), 0) / last7Days.length
      : 0;
    
    const avgROI = last7Days.length > 0
      ? last7Days.reduce((sum, m) => sum + (m.roi || 0), 0) / last7Days.length
      : 0;

    const totalLeads = last7Days.reduce((sum, m) => sum + (m.leads || 0), 0);

    // Fetch active alerts
    const activeAlerts = await base44.asServiceRole.entities.AlertEvent.filter({
      org_id,
      status: 'TRIGGERED'
    });

    // Step 2: Compute week-on-week deltas
    const previousWeekMetrics = await base44.asServiceRole.entities.DailyOrgMetrics.filter({ org_id });
    const last14Days = previousWeekMetrics.filter(m => 
      new Date(m.date) >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    ).sort((a, b) => b.date.localeCompare(a.date));

    const thisWeekAvg = last14Days.slice(0, 7);
    const lastWeekAvg = last14Days.slice(7, 14);

    const deltaSLA = thisWeekAvg.length > 0 && lastWeekAvg.length > 0
      ? ((thisWeekAvg.reduce((s, m) => s + (m.sla_breaches || 0), 0) / thisWeekAvg.length) -
         (lastWeekAvg.reduce((s, m) => s + (m.sla_breaches || 0), 0) / lastWeekAvg.length))
      : 0;

    // Step 3: Draft AI recommendations
    console.log('🤖 Generating AI recommendations...');
    
    const recommendationsPrompt = `
You are an AI business consultant analyzing operational data for a facilities management company.

Based on the following metrics, generate 3-5 actionable recommendations for the executive team:

**Current State:**
- Org Health: ${directorData?.org_health_score || 0}/100
- SLA Breaches: ${directorData?.summary?.sla_breaches || 0}
- At-Risk Jobs: ${directorData?.summary?.at_risk_jobs || 0}
- Avg Utilisation: ${directorData?.summary?.avg_engineer_utilisation || 0}%
- Overdue Invoices: £${(directorData?.financials?.outstanding_invoices?.overdue_value || 0).toLocaleString()}
- 30-Day Revenue: £${(revenueData?.projection_30d || 0).toLocaleString()}
- Marketing ROI: ${avgROI.toFixed(1)}×
- Conversion Rate: ${(avgConversion * 100).toFixed(1)}%

**Week-on-Week Changes:**
- SLA Breaches: ${deltaSLA > 0 ? '+' : ''}${deltaSLA.toFixed(0)} (${deltaSLA > 0 ? 'worsening' : 'improving'})

**Top Risks:**
${directorData?.at_risk_jobs?.slice(0, 3).map(j => `- ${j.title} (${j.sla_risk_pct}% risk)`).join('\n') || 'None'}

Generate recommendations that are:
1. Specific and actionable
2. Prioritized by impact
3. Include confidence level (0.0-1.0)
4. Focus on areas showing deterioration or opportunity

Output format:
{
  "recommendations": [
    {
      "title": "Brief action title",
      "description": "One-sentence explanation with numbers",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "confidence": 0.85
    }
  ]
}
`;

    const aiRecs = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: recommendationsPrompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string" },
                confidence: { type: "number" }
              }
            }
          }
        }
      }
    });

    // Step 4: Compile brief data
    const briefData = {
      org_id,
      week_commencing: weekCommencing,
      generated_at: new Date().toISOString(),
      org_health_score: directorData?.org_health_score || 0,
      financial_summary_json: {
        overdue_value: directorData?.financials?.outstanding_invoices?.overdue_value || 0,
        overdue_count: directorData?.financials?.outstanding_invoices?.overdue_count || 0,
        unbilled_value: directorData?.financials?.unbilled_quotes?.approved_unbilled || 0,
        collection_prob: revenueData?.assumptions_json?.collection_ratio || 0,
        delta_pct: 0
      },
      operational_summary_json: {
        active_jobs: directorData?.summary?.active_jobs || 0,
        sla_breaches: directorData?.summary?.sla_breaches || 0,
        avg_utilisation: directorData?.summary?.avg_engineer_utilisation || 0,
        at_risk_jobs: directorData?.summary?.at_risk_jobs || 0,
        delta_sla_pct: deltaSLA
      },
      marketing_summary_json: {
        conversion_rate: avgConversion,
        avg_roi: avgROI,
        leads: totalLeads,
        top_source: last7Days[0]?.top_source || 'N/A',
        delta_conversion_pct: 0
      },
      forecast_summary_json: {
        projection_30d: revenueData?.projection_30d || 0,
        projection_90d: revenueData?.projection_90d || 0,
        expected_margin: revenueData?.expected_margin || 0,
        risk_band: revenueData?.risk_band || 'N/A'
      },
      risk_summary_json: {
        active_alerts: activeAlerts.length,
        top_risks: [
          ...(directorData?.summary?.sla_breaches > 5 ? [{
            title: `${directorData.summary.sla_breaches} SLA Breaches`,
            description: 'Multiple jobs at risk of missing SLA targets',
            severity: 'HIGH'
          }] : []),
          ...(directorData?.financials?.outstanding_invoices?.overdue_value > 20000 ? [{
            title: `£${(directorData.financials.outstanding_invoices.overdue_value).toLocaleString()} Overdue`,
            description: `${directorData.financials.outstanding_invoices.overdue_count} invoices require immediate collection`,
            severity: 'HIGH'
          }] : []),
          ...(directorData?.summary?.avg_engineer_utilisation >= 85 ? [{
            title: 'Engineer Capacity Critical',
            description: `${directorData.summary.avg_engineer_utilisation}% utilisation - resource shortage`,
            severity: 'MEDIUM'
          }] : [])
        ]
      },
      recommendations_json: aiRecs.recommendations || [],
      created_by_ai: true
    };

    // Step 5: Generate HTML report
    console.log('📄 Generating HTML report...');
    const htmlContent = generateHTMLReport(briefData);

    // Step 6: Convert to PDF (using simple HTML file for now - in production use PDF renderer)
    // For now, store HTML as file
    const fileName = `executive-brief-${org_id}-${weekCommencing}.html`;
    const filePath = `/tmp/${fileName}`;
    
    await Deno.writeTextFile(filePath, htmlContent);
    
    // Upload to storage
    const fileContent = await Deno.readFile(filePath);
    const blob = new Blob([fileContent], { type: 'text/html' });
    
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
      file: blob
    });

    briefData.pdf_url = uploadResult.file_url;

    // Step 7: Store brief record (upsert for this week)
    let brief;
    if (existing.length > 0) {
      brief = await base44.asServiceRole.entities.ExecutiveBrief.update(
        existing[0].id,
        briefData
      );
    } else {
      brief = await base44.asServiceRole.entities.ExecutiveBrief.create(briefData);
    }

    // Step 8: Fetch recipients and distribute
    console.log('📧 Distributing to recipients...');
    const recipients = await base44.asServiceRole.entities.ExecutiveRecipient.filter({
      org_id,
      active: true
    });

    const distributedTo = [];

    for (const recipient of recipients) {
      try {
        if (recipient.preferred_channel === 'email' || !recipient.preferred_channel) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'ENTIRECAFM AI',
            to: recipient.email,
            subject: `Executive Brief – Week of ${new Date(weekCommencing).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`,
            body: `
Hello ${recipient.name},

Your weekly executive briefing is ready.

**Key Highlights:**
• Org Health: ${directorData?.org_health_score || 0}/100
• Revenue Projection (30d): £${(revenueData?.projection_30d || 0).toLocaleString()}
• Overdue: £${(directorData?.financials?.outstanding_invoices?.overdue_value || 0).toLocaleString()}
• SLA Breaches: ${directorData?.summary?.sla_breaches || 0}

View the full report here: ${uploadResult.file_url}

Best regards,
ENTIRECAFM AI Operations
            `
          });
          
          distributedTo.push(recipient.email);
          console.log(`✅ Sent to ${recipient.email}`);
        }
      } catch (emailError) {
        console.error(`Failed to send to ${recipient.email}:`, emailError);
      }
    }

    // Update brief with distribution list
    await base44.asServiceRole.entities.ExecutiveBrief.update(brief.id, {
      distributed_to: distributedTo
    });

    // Step 9: Slack notification
    if (SLACK_WEBHOOK_EXEC) {
      const slackMessage = `📊 *Executive Brief Ready*\n\n` +
        `Week: ${new Date(weekCommencing).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n` +
        `*Key Metrics:*\n` +
        `• Org Health: ${directorData?.org_health_score || 0}/100\n` +
        `• Revenue (30d): £${(revenueData?.projection_30d || 0).toLocaleString()}\n` +
        `• Overdue: £${(directorData?.financials?.outstanding_invoices?.overdue_value || 0).toLocaleString()}\n` +
        `• SLA Breaches: ${directorData?.summary?.sla_breaches || 0}\n\n` +
        `<${uploadResult.file_url}|View Full Report>`;
      
      await postToSlack(slackMessage);
    }

    // Step 10: Publish to Redis
    await publishToRedis(`executive.org.${org_id}`, {
      type: 'brief_generated',
      week: weekCommencing,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Executive brief generated for week ${weekCommencing}`);

    return Response.json({
      success: true,
      brief_id: brief.id,
      week_commencing: weekCommencing,
      report_url: uploadResult.file_url,
      distributed_to: distributedTo,
      recommendations_count: aiRecs.recommendations?.length || 0
    });

  } catch (error) {
    console.error('aiGenerateExecutiveBrief error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});