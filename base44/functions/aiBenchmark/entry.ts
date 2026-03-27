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

    console.log(`📊 Computing benchmarks for org: ${orgId}`);

    // Fetch all organizations (for cross-org benchmarking)
    const allOrgs = await base44.asServiceRole.entities.Organisation.list();
    
    // Fetch metrics for all orgs
    const [allJobs, allRecords, allScores] = await Promise.all([
      base44.asServiceRole.entities.Job.list(),
      base44.asServiceRole.entities.ComplianceRecord.list(),
      base44.asServiceRole.entities.SustainabilityScore.list()
    ]);

    const now = new Date();

    // Aggregate metrics by org
    const orgMetrics = allOrgs.map(org => {
      const orgJobs = allJobs.filter(j => j.org_id === org.id);
      const orgRecords = allRecords.filter(r => r.org_id === org.id);
      const orgScores = allScores.filter(s => s.org_id === org.id && !s.site_id);

      // SLA Performance
      const activeJobs = orgJobs.filter(j => !['completed', 'cancelled'].includes(j.status));
      const slaBreaches = activeJobs.filter(j => {
        if (!j.sla_due_date) return false;
        return new Date(j.sla_due_date) < now;
      }).length;
      const slaPerformance = activeJobs.length > 0 
        ? ((activeJobs.length - slaBreaches) / activeJobs.length) * 100 
        : 100;

      // Compliance Rate
      const overdueRecords = orgRecords.filter(r => new Date(r.next_due_date) < now).length;
      const complianceRate = orgRecords.length > 0 
        ? ((orgRecords.length - overdueRecords) / orgRecords.length) * 100 
        : 100;

      // ESG Score
      const latestScore = orgScores.length > 0 
        ? orgScores.sort((a, b) => new Date(b.computed_at) - new Date(a.computed_at))[0]
        : null;
      const esgScore = latestScore ? latestScore.overall_esg_score : 0;

      return {
        org_id: org.id,
        sla_performance: Math.round(slaPerformance * 10) / 10,
        compliance_rate: Math.round(complianceRate * 10) / 10,
        esg_score: Math.round(esgScore * 10) / 10
      };
    }).filter(m => m.sla_performance > 0 || m.compliance_rate > 0 || m.esg_score > 0);

    console.log(`📈 Aggregated metrics for ${orgMetrics.length} orgs`);

    // Calculate percentiles for the requesting org
    const currentOrgMetrics = orgMetrics.find(m => m.org_id === orgId) || {
      sla_performance: 0,
      compliance_rate: 0,
      esg_score: 0
    };

    function calculatePercentile(value, allValues) {
      const sorted = allValues.sort((a, b) => a - b);
      const below = sorted.filter(v => v < value).length;
      return Math.round((below / sorted.length) * 100);
    }

    const slaValues = orgMetrics.map(m => m.sla_performance);
    const complianceValues = orgMetrics.map(m => m.compliance_rate);
    const esgValues = orgMetrics.map(m => m.esg_score);

    const benchmarks = {
      org_id: orgId,
      generated_at: now.toISOString(),
      your_performance: {
        sla_performance: currentOrgMetrics.sla_performance,
        compliance_rate: currentOrgMetrics.compliance_rate,
        esg_score: currentOrgMetrics.esg_score
      },
      percentile_ranking: {
        sla_performance: calculatePercentile(currentOrgMetrics.sla_performance, slaValues),
        compliance_rate: calculatePercentile(currentOrgMetrics.compliance_rate, complianceValues),
        esg_score: calculatePercentile(currentOrgMetrics.esg_score, esgValues)
      },
      industry_average: {
        sla_performance: Math.round((slaValues.reduce((a, b) => a + b, 0) / slaValues.length) * 10) / 10,
        compliance_rate: Math.round((complianceValues.reduce((a, b) => a + b, 0) / complianceValues.length) * 10) / 10,
        esg_score: Math.round((esgValues.reduce((a, b) => a + b, 0) / esgValues.length) * 10) / 10
      },
      industry_top_10: {
        sla_performance: Math.round(slaValues.sort((a, b) => b - a).slice(0, Math.ceil(slaValues.length * 0.1))[0] * 10) / 10,
        compliance_rate: Math.round(complianceValues.sort((a, b) => b - a).slice(0, Math.ceil(complianceValues.length * 0.1))[0] * 10) / 10,
        esg_score: Math.round(esgValues.sort((a, b) => b - a).slice(0, Math.ceil(esgValues.length * 0.1))[0] * 10) / 10
      },
      sample_size: orgMetrics.length
    };

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: orgId,
      user_id: user.id,
      action: 'READ',
      entity_type: 'Benchmark',
      entity_id: `benchmark-${Date.now()}`,
      new_values: {
        benchmark_computed: true,
        sample_size: benchmarks.sample_size
      }
    });

    console.log('✅ Benchmarks computed');

    return Response.json({
      success: true,
      ...benchmarks
    });

  } catch (error) {
    console.error('AI Benchmark error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});