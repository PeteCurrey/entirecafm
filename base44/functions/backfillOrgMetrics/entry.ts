import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Calculate SLA risk for a job at a specific date
function calculateSLARiskAtDate(job, targetDate) {
  if (!job.sla_due_date || ['completed', 'cancelled'].includes(job.status)) {
    return 0;
  }
  
  const slaDate = new Date(job.sla_due_date);
  const checkDate = new Date(targetDate);
  const timeRemaining = slaDate - checkDate;
  const hoursRemaining = timeRemaining / (1000 * 60 * 60);
  
  let riskPct = 0;
  if (hoursRemaining <= 0) {
    riskPct = 100;
  } else if (hoursRemaining <= 4) {
    riskPct = 90;
  } else if (hoursRemaining <= 8) {
    riskPct = 75;
  } else if (hoursRemaining <= 24) {
    riskPct = 50;
  } else if (hoursRemaining <= 48) {
    riskPct = 25;
  }
  
  return riskPct;
}

// Calculate metrics for a specific date
function calculateMetricsForDate(jobs, invoices, quotes, targetDate) {
  const targetDateStr = targetDate.toISOString().split('T')[0];
  const targetDateTime = targetDate.getTime();
  
  // Filter data to only include records that existed at target date
  const jobsAtDate = jobs.filter(j => {
    const createdDate = new Date(j.created_date).getTime();
    return createdDate <= targetDateTime;
  });
  
  const invoicesAtDate = invoices.filter(i => {
    const createdDate = new Date(i.created_date).getTime();
    return createdDate <= targetDateTime;
  });
  
  const quotesAtDate = quotes.filter(q => {
    const createdDate = new Date(q.created_date).getTime();
    return createdDate <= targetDateTime;
  });
  
  // Active jobs (not completed/cancelled at target date)
  const activeJobs = jobsAtDate.filter(j => {
    if (j.status === 'completed' && j.completed_date) {
      return new Date(j.completed_date).getTime() > targetDateTime;
    }
    if (j.status === 'cancelled') {
      return new Date(j.updated_date || j.created_date).getTime() > targetDateTime;
    }
    return true;
  });
  
  // Completed jobs by target date
  const completedJobs = jobsAtDate.filter(j => {
    return j.status === 'completed' && j.completed_date && 
           new Date(j.completed_date).getTime() <= targetDateTime;
  });
  
  // SLA breaches at target date
  const slaBreaches = activeJobs.filter(j => {
    if (!j.sla_due_date) return false;
    return new Date(j.sla_due_date).getTime() < targetDateTime;
  }).length;
  
  // At-risk jobs at target date
  const atRiskJobs = activeJobs.filter(j => {
    return calculateSLARiskAtDate(j, targetDate) > 0;
  }).length;
  
  // Engineer utilisation (estimate based on active jobs)
  const engineers = [...new Set(activeJobs.map(j => j.assigned_engineer_id).filter(Boolean))];
  const avgUtilisation = engineers.length > 0
    ? Math.min(100, (activeJobs.length / engineers.length) * 15) // Rough estimate: 1 eng ≈ 6-7 jobs = 100%
    : 0;
  
  // Overdue invoices at target date
  const overdueInvoices = invoicesAtDate.filter(i => {
    if (i.status === 'paid') return false;
    if (!i.due_date) return false;
    return new Date(i.due_date).getTime() < targetDateTime;
  });
  
  const overdueValue = overdueInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
  
  // Unbilled quotes (approved but not invoiced) at target date
  const approvedQuotes = quotesAtDate.filter(q => {
    return q.status === 'client_approved' || q.status === 'ready_to_schedule';
  });
  
  const unbilledValue = approvedQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
  
  // Calculate org health score
  let healthScore = 100;
  healthScore -= slaBreaches * 10;
  healthScore -= Math.min(30, atRiskJobs * 3);
  healthScore -= Math.min(20, overdueInvoices.length * 5);
  if (avgUtilisation < 50) healthScore -= 10;
  if (avgUtilisation > 90) healthScore -= 15;
  
  return {
    date: targetDateStr,
    org_health_score: Math.max(0, Math.min(100, Math.round(healthScore))),
    sla_breaches: slaBreaches,
    at_risk_jobs: atRiskJobs,
    avg_utilisation_pct: Math.round(avgUtilisation),
    overdue_value: overdueValue,
    unbilled_value: unbilledValue,
    active_jobs: activeJobs.length,
    completed_jobs: completedJobs.length
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const url = new URL(req.url);
    const daysBack = parseInt(url.searchParams.get('days') || '30');
    
    console.log(`📊 Starting backfill for last ${daysBack} days...`);
    
    // Fetch all unique organizations
    const clients = await base44.asServiceRole.entities.Client.list();
    const uniqueOrgIds = [...new Set(clients.map(c => c.org_id))];
    
    console.log(`📋 Found ${uniqueOrgIds.length} organizations`);
    
    const results = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    for (const orgId of uniqueOrgIds) {
      console.log(`\n🏢 Processing org: ${orgId}`);
      
      // Fetch all historical data for this org
      const [jobs, invoices, quotes] = await Promise.all([
        base44.asServiceRole.entities.Job.filter({ org_id: orgId }),
        base44.asServiceRole.entities.Invoice.filter({ org_id: orgId }),
        base44.asServiceRole.entities.Quote.filter({ org_id: orgId })
      ]);
      
      console.log(`📦 Loaded: ${jobs.length} jobs, ${invoices.length} invoices, ${quotes.length} quotes`);
      
      // Check existing snapshots
      const existingSnapshots = await base44.asServiceRole.entities.DailyOrgMetrics.filter({
        org_id: orgId
      });
      
      const existingDates = new Set(existingSnapshots.map(s => s.date));
      console.log(`✅ Found ${existingDates.size} existing snapshots`);
      
      const orgResults = {
        org_id: orgId,
        snapshots: [],
        skipped: 0,
        created: 0,
        errors: 0
      };
      
      // Generate snapshots for each day
      for (let i = 1; i <= daysBack; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() - i);
        const targetDateStr = targetDate.toISOString().split('T')[0];
        
        // Skip if snapshot already exists
        if (existingDates.has(targetDateStr)) {
          orgResults.skipped++;
          continue;
        }
        
        try {
          // Calculate metrics for this date
          const metrics = calculateMetricsForDate(jobs, invoices, quotes, targetDate);
          
          // Create snapshot
          await base44.asServiceRole.entities.DailyOrgMetrics.create({
            org_id: orgId,
            ...metrics
          });
          
          orgResults.created++;
          orgResults.snapshots.push({
            date: targetDateStr,
            org_health_score: metrics.org_health_score,
            active_jobs: metrics.active_jobs
          });
          
          console.log(`  ✅ ${targetDateStr}: health=${metrics.org_health_score}, active=${metrics.active_jobs}`);
          
        } catch (error) {
          console.error(`  ❌ ${targetDateStr}: ${error.message}`);
          orgResults.errors++;
        }
      }
      
      results.push(orgResults);
      console.log(`\n📊 Org ${orgId}: Created ${orgResults.created}, Skipped ${orgResults.skipped}, Errors ${orgResults.errors}`);
    }
    
    // Summary
    const summary = {
      total_orgs: uniqueOrgIds.length,
      total_created: results.reduce((sum, r) => sum + r.created, 0),
      total_skipped: results.reduce((sum, r) => sum + r.skipped, 0),
      total_errors: results.reduce((sum, r) => sum + r.errors, 0),
      days_backfilled: daysBack
    };
    
    console.log('\n✅ Backfill complete:');
    console.log(`   Organizations: ${summary.total_orgs}`);
    console.log(`   Snapshots created: ${summary.total_created}`);
    console.log(`   Snapshots skipped: ${summary.total_skipped}`);
    console.log(`   Errors: ${summary.total_errors}`);
    
    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: 'system',
      user_id: 'system',
      action: 'CREATE',
      entity_type: 'DailyOrgMetrics',
      entity_id: 'backfill',
      new_values: summary
    });
    
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      results
    });
    
  } catch (error) {
    console.error('backfillOrgMetrics error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});