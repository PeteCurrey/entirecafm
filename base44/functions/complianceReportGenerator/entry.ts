import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    console.log(`📊 Generating compliance report for org: ${orgId}`);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    // Fetch all data
    const [records, requirements, assets, sites, scores, metrics, organisation] = await Promise.all([
      base44.asServiceRole.entities.ComplianceRecord.filter({ org_id: orgId }),
      base44.asServiceRole.entities.ComplianceRequirement.filter({ org_id: orgId }),
      base44.asServiceRole.entities.Asset.filter({ org_id: orgId }),
      base44.asServiceRole.entities.Site.filter({ org_id: orgId }),
      base44.asServiceRole.entities.SustainabilityScore.filter({ org_id: orgId }),
      base44.asServiceRole.entities.ESGMetric.filter({ org_id: orgId }),
      base44.asServiceRole.entities.Organisation.filter({ id: orgId })
    ]);

    // Calculate compliance metrics
    const totalTests = records.length;
    const overdueTests = records.filter(r => new Date(r.next_due_date) < now).length;
    const complianceRate = totalTests > 0 ? ((totalTests - overdueTests) / totalTests) * 100 : 100;
    
    const expiringSoon = records.filter(r => {
      const dueDate = new Date(r.next_due_date);
      return dueDate >= now && dueDate < thirtyDaysFromNow;
    });

    const overdueRecords = records.filter(r => new Date(r.next_due_date) < now);

    // Get latest org ESG score
    const orgScore = scores.find(s => s.site_id === null) || {
      overall_esg_score: 0,
      rating: 'POOR',
      compliance_rate_pct: 0,
      carbon_intensity: 0,
      waste_diversion_pct: 0
    };

    // ESG trends (last 3 months)
    const recentMetrics = metrics.filter(m => 
      new Date(m.recorded_at) >= threeMonthsAgo
    );

    const energyTotal = recentMetrics
      .filter(m => m.metric_type === 'energy_kwh')
      .reduce((sum, m) => sum + m.value, 0);
    
    const co2Total = recentMetrics
      .filter(m => m.metric_type === 'co2_tonnes')
      .reduce((sum, m) => sum + m.value, 0);

    // Generate PDF content using AI
    const pdfPrompt = `
Generate a professional Monthly Compliance & Sustainability Report in HTML format.

Organization: ${organisation[0]?.name || 'Unknown'}
Report Date: ${now.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}

KEY METRICS:
- Overall Compliance Rate: ${Math.round(complianceRate)}%
- Overdue Tests: ${overdueTests}
- Tests Expiring (Next 30 Days): ${expiringSoon.length}
- ESG Score: ${orgScore.overall_esg_score}/100 (${orgScore.rating})
- Carbon Emissions (3 months): ${co2Total.toFixed(2)} tonnes
- Energy Consumption (3 months): ${energyTotal.toFixed(0)} kWh

OVERDUE TESTS (Top 10):
${overdueRecords.slice(0, 10).map(r => {
  const asset = assets.find(a => a.id === r.asset_id);
  const site = sites.find(s => s.id === r.site_id);
  const req = requirements.find(rq => rq.id === r.requirement_id);
  const daysOverdue = Math.floor((now - new Date(r.next_due_date)) / (1000 * 60 * 60 * 24));
  return `- ${req?.requirement_name || 'Test'} for ${asset?.name || 'Asset'} at ${site?.name || 'Site'} (${daysOverdue} days overdue)`;
}).join('\n')}

EXPIRING SOON (Next 30 Days):
${expiringSoon.slice(0, 10).map(r => {
  const asset = assets.find(a => a.id === r.asset_id);
  const site = sites.find(s => s.id === r.site_id);
  const req = requirements.find(rq => rq.id === r.requirement_id);
  const daysUntil = Math.floor((new Date(r.next_due_date) - now) / (1000 * 60 * 60 * 24));
  return `- ${req?.requirement_name || 'Test'} for ${asset?.name || 'Asset'} at ${site?.name || 'Site'} (due in ${daysUntil} days)`;
}).join('\n')}

ESG PERFORMANCE:
- Compliance Rate: ${orgScore.compliance_rate_pct}%
- Carbon Intensity: ${orgScore.carbon_intensity} kg CO₂/kWh
- Waste Diversion: ${orgScore.waste_diversion_pct}%

Create a professional HTML report with:
1. Executive Summary section
2. Compliance Status section with charts
3. Overdue & Expiring Tests tables
4. ESG Performance section
5. Recommendations section

Use professional styling with blue/green color scheme. Return ONLY the HTML.
`;

    const htmlContent = await base44.integrations.Core.InvokeLLM({
      prompt: pdfPrompt
    });

    console.log('✅ Report HTML generated');

    // Store report as document
    const reportTitle = `Compliance & Sustainability Report - ${now.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}`;
    
    // Create blob and upload
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const file = new File([blob], `compliance-report-${now.getTime()}.html`, { type: 'text/html' });
    
    const uploadResult = await base44.integrations.Core.UploadFile({ file });
    const reportUrl = uploadResult.file_url;

    console.log(`✅ Report uploaded: ${reportUrl}`);

    // Get admin users and client contacts for emailing
    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    
    // Email to directors/admins
    for (const admin of adminUsers) {
      try {
        await base44.integrations.Core.SendEmail({
          to: admin.email,
          subject: `${reportTitle} - ${organisation[0]?.name || 'Organization'}`,
          body: `
Dear ${admin.full_name},

Your monthly Compliance & Sustainability Report is ready.

Key Highlights:
✅ Compliance Rate: ${Math.round(complianceRate)}%
⚠️ Overdue Tests: ${overdueTests}
📅 Expiring Soon: ${expiringSoon.length}
🌍 ESG Score: ${orgScore.overall_esg_score}/100 (${orgScore.rating})

View the full report here: ${reportUrl}

Best regards,
EntireCAFM Compliance Team
          `
        });
        console.log(`✅ Email sent to ${admin.email}`);
      } catch (error) {
        console.error(`Failed to email ${admin.email}:`, error);
      }
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: orgId,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'ComplianceReport',
      entity_id: reportUrl,
      new_values: {
        report_generated: true,
        compliance_rate: complianceRate,
        esg_score: orgScore.overall_esg_score,
        emails_sent: adminUsers.length
      }
    });

    return Response.json({
      success: true,
      report_url: reportUrl,
      report_title: reportTitle,
      compliance_rate: Math.round(complianceRate * 10) / 10,
      overdue_tests: overdueTests,
      expiring_soon: expiringSoon.length,
      esg_score: orgScore.overall_esg_score,
      emails_sent: adminUsers.length
    });

  } catch (error) {
    console.error('Compliance report error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});