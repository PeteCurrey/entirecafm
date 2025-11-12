import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Redis client (Upstash REST API compatible)
const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

async function publishToRedis(channel, message) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('Redis not configured, skipping pub/sub');
    return;
  }
  
  try {
    const response = await fetch(`${REDIS_URL}/publish/${channel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      console.error('Redis publish failed:', await response.text());
    } else {
      console.log(`✅ Published to ${channel}`);
    }
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

function calculateSLARisk(job, now) {
  if (!job.sla_due_date || job.status === 'completed' || job.status === 'cancelled') {
    return 0;
  }
  
  const slaStart = job.created_date ? new Date(job.created_date) : now;
  const slaDue = new Date(job.sla_due_date);
  const totalDuration = slaDue - slaStart;
  const elapsed = now - slaStart;
  
  if (totalDuration <= 0) return 100; // Invalid SLA
  
  const riskPct = (elapsed / totalDuration) * 100;
  return Math.min(Math.max(riskPct, 0), 100);
}

function calculateClientHealthScore(client, clientData) {
  const { slaBreaches = 0, overdueInvoices = 0, oldQuotes = 0, totalJobs = 0, completedJobs = 0 } = clientData;
  
  let score = 100;
  
  // Penalties
  score -= slaBreaches * 10;
  score -= overdueInvoices * 5;
  score -= oldQuotes * 2;
  
  // Bonus for good completion rate
  if (totalJobs > 0) {
    const completionRate = completedJobs / totalJobs;
    score += completionRate * 10;
  }
  
  return Math.max(Math.min(score, 100), 0);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get org_id from request or user
    let org_id = user.org_id || 'default-org';
    
    try {
      const body = await req.json();
      if (body.org_id) {
        org_id = body.org_id;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    console.log(`📊 Generating Director Dashboard for org: ${org_id}`);

    const now = new Date();
    const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [jobs, engineers, quotes, invoices, clients, sites] = await Promise.all([
      base44.entities.Job.filter({ org_id }),
      base44.entities.User.list(),
      base44.entities.Quote.filter({ org_id }),
      base44.entities.Invoice.filter({ org_id }),
      base44.entities.Client.filter({ org_id }),
      base44.entities.Site.filter({ org_id })
    ]);

    console.log(`✅ Fetched: ${jobs.length} jobs, ${engineers.length} engineers, ${quotes.length} quotes, ${invoices.length} invoices`);

    // ===== 1. JOBS ANALYSIS =====
    
    const activeJobs = jobs.filter(j => 
      j.status !== 'completed' && j.status !== 'cancelled'
    );

    const completedJobs = jobs.filter(j => j.status === 'completed');

    // Calculate SLA risk for active jobs
    const jobsWithRisk = activeJobs.map(job => ({
      ...job,
      sla_risk_pct: calculateSLARisk(job, now)
    }));

    const atRiskJobs = jobsWithRisk
      .filter(j => j.sla_risk_pct > 75)
      .sort((a, b) => b.sla_risk_pct - a.sla_risk_pct)
      .slice(0, 10)
      .map(j => ({
        id: j.id,
        job_number: j.job_number,
        title: j.title,
        status: j.status,
        priority: j.priority,
        sla_risk_pct: Math.round(j.sla_risk_pct),
        sla_due_date: j.sla_due_date,
        client_id: j.client_id,
        assigned_engineer_id: j.assigned_engineer_id
      }));

    const slaBreaches = jobsWithRisk.filter(j => j.sla_risk_pct >= 100).length;

    // ===== 2. ENGINEER UTILISATION =====
    
    const engineersInOrg = engineers.filter(u => 
      u.role === 'user' // Assuming 'user' role is for engineers
    );

    const jobsNext48h = activeJobs.filter(j => {
      if (!j.scheduled_date) return false;
      const scheduledDate = new Date(j.scheduled_date);
      return scheduledDate >= now && scheduledDate <= next48h;
    });

    const engineersUtilisation = engineersInOrg.map(engineer => {
      const assignedJobsNext48h = jobsNext48h.filter(j => 
        j.assigned_engineer_id === engineer.id
      ).length;
      
      // Assume 8 jobs per day capacity, 16 for 48h
      const maxCapacity = 16;
      const utilisationPct = Math.min((assignedJobsNext48h / maxCapacity) * 100, 100);

      return {
        engineer_id: engineer.id,
        engineer_name: engineer.full_name,
        jobs_next_48h: assignedJobsNext48h,
        capacity_pct: Math.round(utilisationPct),
        status: utilisationPct > 90 ? 'overloaded' : utilisationPct > 70 ? 'busy' : 'available'
      };
    }).sort((a, b) => b.capacity_pct - a.capacity_pct);

    const avgUtilisation = engineersUtilisation.length > 0
      ? Math.round(engineersUtilisation.reduce((sum, e) => sum + e.capacity_pct, 0) / engineersUtilisation.length)
      : 0;

    // ===== 3. FINANCIAL METRICS =====
    
    const pendingQuotes = quotes.filter(q => 
      ['draft', 'sent'].includes(q.status)
    );

    const approvedQuotes = quotes.filter(q => 
      ['client_approved', 'ready_to_schedule'].includes(q.status)
    );

    const overdueInvoices = invoices.filter(inv => {
      if (inv.status === 'paid') return false;
      if (!inv.due_date) return false;
      return new Date(inv.due_date) < now;
    });

    const totalPendingQuoteValue = pendingQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
    const totalApprovedUnbilledValue = approvedQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
    const totalOverdueInvoiceValue = overdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalOutstandingInvoices = invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // ===== 4. CLIENT HEALTH SCORES =====
    
    const clientHealthData = clients.map(client => {
      const clientJobs = jobs.filter(j => j.client_id === client.id);
      const clientInvoices = invoices.filter(inv => inv.client_id === client.id);
      const clientQuotes = quotes.filter(q => q.client_id === client.id);

      const slaBreachesCount = clientJobs.filter(j => {
        const risk = calculateSLARisk(j, now);
        return risk >= 100;
      }).length;

      const overdueInvoicesCount = clientInvoices.filter(inv => {
        if (inv.status === 'paid') return false;
        if (!inv.due_date) return false;
        return new Date(inv.due_date) < now;
      }).length;

      const oldQuotesCount = clientQuotes.filter(q => {
        if (q.status !== 'sent') return false;
        if (!q.sent_date) return false;
        const daysSinceSent = (now - new Date(q.sent_date)) / (1000 * 60 * 60 * 24);
        return daysSinceSent > 7;
      }).length;

      const totalJobs = clientJobs.length;
      const completedJobsCount = clientJobs.filter(j => j.status === 'completed').length;

      const healthScore = calculateClientHealthScore(client, {
        slaBreaches: slaBreachesCount,
        overdueInvoices: overdueInvoicesCount,
        oldQuotes: oldQuotesCount,
        totalJobs,
        completedJobs: completedJobsCount
      });

      return {
        client_id: client.id,
        client_name: client.name,
        health_score: Math.round(healthScore),
        sla_breaches: slaBreachesCount,
        overdue_invoices: overdueInvoicesCount,
        old_quotes: oldQuotesCount,
        active_jobs: clientJobs.filter(j => 
          j.status !== 'completed' && j.status !== 'cancelled'
        ).length,
        total_outstanding: clientInvoices
          .filter(inv => inv.status !== 'paid')
          .reduce((sum, inv) => sum + (inv.total || 0), 0)
      };
    }).sort((a, b) => a.health_score - b.health_score);

    const unhealthyClients = clientHealthData.filter(c => c.health_score < 60);

    // ===== 5. ORG HEALTH SCORE =====
    
    let orgHealthScore = 100;
    
    // Penalties
    orgHealthScore -= Math.min(slaBreaches * 5, 30);
    orgHealthScore -= Math.min(overdueInvoices.length * 3, 20);
    orgHealthScore -= Math.min(unhealthyClients.length * 5, 20);
    
    // Bonus for good utilisation
    if (avgUtilisation >= 60 && avgUtilisation <= 85) {
      orgHealthScore += 10;
    }

    orgHealthScore = Math.max(Math.min(orgHealthScore, 100), 0);

    // ===== 6. FORECASTS =====
    
    const jobsNext7d = activeJobs.filter(j => {
      if (!j.scheduled_date) return false;
      const scheduledDate = new Date(j.scheduled_date);
      return scheduledDate >= now && scheduledDate <= next7d;
    });

    const next7dRevenueProjection = approvedQuotes
      .filter(q => {
        if (!q.valid_until) return true;
        return new Date(q.valid_until) >= now;
      })
      .reduce((sum, q) => sum + (q.total || 0), 0);

    const capacityNext48h = {
      total_capacity: engineersInOrg.length * 16, // 8 jobs per day per engineer
      allocated_jobs: jobsNext48h.length,
      utilisation_pct: Math.round((jobsNext48h.length / (engineersInOrg.length * 16)) * 100),
      available_slots: Math.max((engineersInOrg.length * 16) - jobsNext48h.length, 0)
    };

    // ===== 7. PREPARE RESPONSE =====
    
    const dashboardData = {
      org_id,
      generated_at: now.toISOString(),
      org_health_score: Math.round(orgHealthScore),
      summary: {
        active_jobs: activeJobs.length,
        completed_jobs: completedJobs.length,
        sla_breaches: slaBreaches,
        at_risk_jobs: atRiskJobs.length,
        avg_engineer_utilisation: avgUtilisation
      },
      engineers_utilisation: engineersUtilisation.slice(0, 10),
      at_risk_jobs: atRiskJobs,
      client_health: {
        total_clients: clients.length,
        unhealthy_clients: unhealthyClients.length,
        top_risk_clients: unhealthyClients.slice(0, 5)
      },
      financials: {
        outstanding_invoices: {
          total_value: Math.round(totalOutstandingInvoices * 100) / 100,
          overdue_value: Math.round(totalOverdueInvoiceValue * 100) / 100,
          overdue_count: overdueInvoices.length
        },
        unbilled_quotes: {
          pending_approval: Math.round(totalPendingQuoteValue * 100) / 100,
          approved_unbilled: Math.round(totalApprovedUnbilledValue * 100) / 100
        },
        total_at_risk: Math.round((totalOverdueInvoiceValue + totalApprovedUnbilledValue) * 100) / 100
      },
      forecast_summary: {
        next_48h_capacity: capacityNext48h,
        next_7d_revenue_projection: Math.round(next7dRevenueProjection * 100) / 100,
        next_7d_scheduled_jobs: jobsNext7d.length
      }
    };

    // ===== 8. PUBLISH TO REDIS =====
    
    await publishToRedis(`director.org.${org_id}`, {
      type: 'director_dashboard_update',
      data: dashboardData,
      timestamp: now.toISOString()
    });

    // ===== 9. CREATE AUDIT LOG =====
    
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'DirectorDashboard',
      entity_id: `dashboard-${Date.now()}`,
      new_values: {
        org_health_score: dashboardData.org_health_score,
        generated_at: dashboardData.generated_at
      }
    });

    console.log(`✅ Director Dashboard generated successfully`);

    return Response.json({
      success: true,
      ...dashboardData
    });

  } catch (error) {
    console.error('aiDirectorDashboard error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});