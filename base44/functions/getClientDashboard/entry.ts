import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { client_id } = body;

    if (!client_id) {
      return Response.json({ error: 'client_id required' }, { status: 400 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Fetch all data in parallel
    const [jobs, invoices, requests, assets, sites, feedback] = await Promise.all([
      base44.asServiceRole.entities.Job.filter({ client_id }),
      base44.asServiceRole.entities.Invoice.filter({ client_id }),
      base44.asServiceRole.entities.Request.filter({ client_id }),
      base44.asServiceRole.entities.Asset.list(),
      base44.asServiceRole.entities.Site.filter({ client_id }),
      base44.asServiceRole.entities.ClientFeedback.filter({ client_id })
    ]);

    // Filter assets for client sites
    const siteIds = sites.map(s => s.id);
    const clientAssets = assets.filter(a => siteIds.includes(a.site_id));

    // Calculate metrics
    const jobsOpen = jobs.filter(j => !['completed', 'cancelled'].includes(j.status)).length;
    const jobsClosed30d = jobs.filter(j => 
      j.status === 'completed' && 
      j.completed_date && 
      new Date(j.completed_date) >= thirtyDaysAgo
    ).length;

    // SLA Score (percentage of jobs meeting SLA)
    const jobsWithSLA = jobs.filter(j => j.sla_due_date);
    const jobsMeetingSLA = jobsWithSLA.filter(j => {
      if (!j.completed_date) {
        return new Date(j.sla_due_date) >= now;
      }
      return new Date(j.completed_date) <= new Date(j.sla_due_date);
    });
    const slaScore = jobsWithSLA.length > 0 
      ? Math.round((jobsMeetingSLA.length / jobsWithSLA.length) * 100)
      : 100;

    // Financial metrics
    const totalSpendYTD = invoices
      .filter(i => i.issue_date && new Date(i.issue_date) >= yearStart)
      .reduce((sum, i) => sum + (i.total || 0), 0);

    const overdueInvoices = invoices.filter(i => {
      if (i.status === 'paid') return false;
      return i.due_date && new Date(i.due_date) < now;
    });
    const overdueValue = overdueInvoices.reduce((sum, i) => sum + (i.total || 0), 0);

    // Recent activity
    const recentJobs = jobs
      .filter(j => j.updated_date && new Date(j.updated_date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
      .slice(0, 10);

    // Average feedback rating
    const avgRating = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : 0;

    // SLA trend (last 30 days)
    const slaTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      
      const dayJobs = jobs.filter(j => {
        if (!j.sla_due_date) return false;
        const slaDate = new Date(j.sla_due_date).toISOString().split('T')[0];
        return slaDate === dateStr;
      });
      
      const dayScore = dayJobs.length > 0
        ? (dayJobs.filter(j => 
            !j.completed_date || new Date(j.completed_date) <= new Date(j.sla_due_date)
          ).length / dayJobs.length) * 100
        : 100;
      
      slaTrend.push({
        date: dateStr,
        score: Math.round(dayScore)
      });
    }

    return Response.json({
      success: true,
      dashboard: {
        jobs_open: jobsOpen,
        jobs_closed_30d: jobsClosed30d,
        sla_score: slaScore,
        total_spend_ytd: totalSpendYTD,
        overdue_invoices: overdueInvoices.length,
        overdue_value: overdueValue,
        asset_count: clientAssets.length,
        open_requests: requests.filter(r => r.status === 'pending').length,
        avg_rating: avgRating,
        recent_jobs: recentJobs.map(j => ({
          id: j.id,
          title: j.title,
          status: j.status,
          priority: j.priority,
          updated_date: j.updated_date
        })),
        sla_trend: slaTrend
      }
    });

  } catch (error) {
    console.error('Client dashboard error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});