import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { dashboard_type, org_id } = body;
    const orgId = org_id || user.org_id || 'default-org';

    console.log(`📄 Generating ${dashboard_type} report for org: ${orgId}`);

    let reportContent = '';
    const now = new Date();

    // Fetch data based on dashboard type
    if (dashboard_type === 'director') {
      const result = await base44.functions.invoke('aiDirectorDashboard', { org_id: orgId });
      const data = result.data;

      reportContent = `
        <h1>Director Operations Report</h1>
        <p>Generated: ${now.toLocaleDateString()}</p>
        
        <h2>Organization Health: ${data.org_health_score}/100</h2>
        <ul>
          <li>Active Jobs: ${data.summary.active_jobs}</li>
          <li>SLA Breaches: ${data.summary.sla_breaches}</li>
          <li>Avg Engineer Utilisation: ${data.summary.avg_engineer_utilisation}%</li>
        </ul>

        <h2>Financial Overview</h2>
        <ul>
          <li>Overdue Invoices: £${data.financials.outstanding_invoices.overdue_value}</li>
          <li>Total Outstanding: £${data.financials.outstanding_invoices.total_value}</li>
        </ul>

        <h2>At-Risk Jobs</h2>
        <table border="1" cellpadding="5">
          <tr><th>Job</th><th>SLA Risk</th><th>Status</th></tr>
          ${data.at_risk_jobs.slice(0, 10).map(job => `
            <tr><td>${job.title}</td><td>${job.sla_risk_pct}%</td><td>${job.status}</td></tr>
          `).join('')}
        </table>
      `;
    } else if (dashboard_type === 'compliance') {
      const [records, requirements, scores] = await Promise.all([
        base44.asServiceRole.entities.ComplianceRecord.filter({ org_id: orgId }),
        base44.asServiceRole.entities.ComplianceRequirement.filter({ org_id: orgId }),
        base44.asServiceRole.entities.SustainabilityScore.filter({ org_id: orgId })
      ]);

      const overdue = records.filter(r => new Date(r.next_due_date) < now).length;
      const complianceRate = records.length > 0 ? ((records.length - overdue) / records.length) * 100 : 100;
      const latestScore = scores.length > 0 ? scores.sort((a, b) => new Date(b.computed_at) - new Date(a.computed_at))[0] : null;

      reportContent = `
        <h1>Compliance & ESG Report</h1>
        <p>Generated: ${now.toLocaleDateString()}</p>
        
        <h2>Compliance Overview</h2>
        <ul>
          <li>Total Tests: ${records.length}</li>
          <li>Overdue: ${overdue}</li>
          <li>Compliance Rate: ${Math.round(complianceRate)}%</li>
        </ul>

        <h2>ESG Score</h2>
        ${latestScore ? `
          <ul>
            <li>Overall Score: ${latestScore.overall_esg_score}/100</li>
            <li>Rating: ${latestScore.rating}</li>
            <li>Carbon Intensity: ${latestScore.carbon_intensity}</li>
            <li>Waste Diversion: ${latestScore.waste_diversion_pct}%</li>
          </ul>
        ` : '<p>No ESG data available</p>'}
      `;
    } else if (dashboard_type === 'pafe') {
      const [features, scores] = await Promise.all([
        base44.asServiceRole.entities.AssetFeatures.filter({ org_id: orgId }),
        base44.asServiceRole.entities.AssetFailureScore.filter({ org_id: orgId })
      ]);

      const highRisk = scores.filter(s => s.risk_band === 'HIGH').length;
      const medRisk = scores.filter(s => s.risk_band === 'MED').length;

      reportContent = `
        <h1>Predictive Asset Failure Report</h1>
        <p>Generated: ${now.toLocaleDateString()}</p>
        
        <h2>Risk Overview</h2>
        <ul>
          <li>High Risk Assets: ${highRisk}</li>
          <li>Medium Risk Assets: ${medRisk}</li>
          <li>Total Assets Monitored: ${features.length}</li>
        </ul>

        <h2>High Risk Assets</h2>
        <table border="1" cellpadding="5">
          <tr><th>Asset ID</th><th>Risk Score</th><th>RUL (days)</th></tr>
          ${scores.filter(s => s.risk_band === 'HIGH').slice(0, 10).map(s => `
            <tr><td>${s.asset_id}</td><td>${(s.risk_score * 100).toFixed(0)}</td><td>${s.rul_days || 'N/A'}</td></tr>
          `).join('')}
        </table>
      `;
    }

    // Use AI to enhance report
    const enhancedReport = await base44.integrations.Core.InvokeLLM({
      prompt: `Convert this report data into a professional HTML document with styling:
${reportContent}

Add:
- Professional CSS styling (blue/green theme)
- Executive summary at top
- Key insights section
- Recommendations section

Return ONLY the complete HTML document.`,
    });

    // Create blob and upload
    const blob = new Blob([enhancedReport], { type: 'text/html' });
    const filename = `${dashboard_type}-report-${Date.now()}.html`;
    const file = new File([blob], filename, { type: 'text/html' });
    
    const uploadResult = await base44.integrations.Core.UploadFile({ file });

    await base44.asServiceRole.entities.AuditLog.create({
      org_id: orgId,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'Report',
      entity_id: uploadResult.file_url,
      new_values: { dashboard_type, generated_at: now.toISOString() }
    });

    console.log(`✅ Report generated: ${uploadResult.file_url}`);

    return Response.json({
      success: true,
      report_url: uploadResult.file_url,
      report_type: dashboard_type,
      generated_at: now.toISOString()
    });

  } catch (error) {
    console.error('Report generator error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});