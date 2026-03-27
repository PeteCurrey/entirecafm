import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Redis for real-time notifications
const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

async function publishToRedis(channel, message) {
  if (!REDIS_URL || !REDIS_TOKEN) return false;
  
  try {
    const response = await fetch(`${REDIS_URL}/publish/${channel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });
    return response.ok;
  } catch (error) {
    console.error('Redis publish error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This can be called by scheduler or admin
    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      // Called from scheduler, proceed with service role
    }

    const body = await req.json().catch(() => ({}));
    const { org_id } = body;

    // Get all active jobs
    const filter = org_id ? { org_id } : {};
    const jobs = await base44.asServiceRole.entities.Job.filter(filter);

    const now = new Date();
    const alertsGenerated = [];
    const SLA_WARNING_THRESHOLDS = [60, 30, 15]; // minutes before SLA breach

    for (const job of jobs) {
      // Skip completed/cancelled jobs
      if (['completed', 'cancelled'].includes(job.status)) continue;
      
      // Skip jobs without SLA
      if (!job.sla_due_date) continue;

      const slaDue = new Date(job.sla_due_date);
      const minutesRemaining = Math.floor((slaDue - now) / (1000 * 60));

      // Check if within warning thresholds
      for (const threshold of SLA_WARNING_THRESHOLDS) {
        if (minutesRemaining > 0 && minutesRemaining <= threshold) {
          // Check if we already sent this threshold alert
          const alertKey = `sla_alert_${job.id}_${threshold}`;
          const existingAlerts = await base44.asServiceRole.entities.AlertEvent.filter({
            org_id: job.org_id,
            alert_key: alertKey
          });

          if (existingAlerts.length === 0) {
            // Send SLA warning notification
            const notificationData = {
              job: {
                id: job.id,
                title: job.title,
                job_number: job.job_number,
                priority: job.priority,
                status: job.status,
                sla_due_date: job.sla_due_date
              },
              minutes_remaining: minutesRemaining
            };

            // Notify assigned engineer
            if (job.assigned_engineer_id) {
              await publishToRedis(`engineer.${job.assigned_engineer_id}`, {
                type: 'sla_warning',
                data: notificationData,
                timestamp: now.toISOString()
              });
            }

            // Notify org admins
            await publishToRedis(`org.${job.org_id}.alerts`, {
              type: 'sla_warning',
              data: {
                ...notificationData,
                message: `SLA Warning: ${job.title} - ${minutesRemaining} minutes remaining`
              },
              timestamp: now.toISOString()
            });

            // Record alert to prevent duplicates
            await base44.asServiceRole.entities.AlertEvent.create({
              org_id: job.org_id,
              alert_type: 'SLA_WARNING',
              alert_key: alertKey,
              title: `SLA Warning: ${threshold} minutes`,
              message: `Job "${job.title}" has ${minutesRemaining} minutes until SLA breach`,
              deep_link: `/jobs/${job.id}`,
              severity: threshold <= 15 ? 'critical' : 'warning'
            });

            alertsGenerated.push({
              job_id: job.id,
              job_title: job.title,
              minutes_remaining: minutesRemaining,
              threshold
            });

            break; // Only send one alert per job per check
          }
        }
      }

      // Check for SLA breach
      if (minutesRemaining <= 0) {
        const breachKey = `sla_breach_${job.id}`;
        const existingBreach = await base44.asServiceRole.entities.AlertEvent.filter({
          org_id: job.org_id,
          alert_key: breachKey
        });

        if (existingBreach.length === 0) {
          // Critical breach notification
          await publishToRedis(`org.${job.org_id}.alerts`, {
            type: 'critical_alert',
            data: {
              id: `breach-${job.id}`,
              message: `SLA BREACHED: ${job.title}`,
              job_id: job.id,
              severity: 'critical'
            },
            timestamp: now.toISOString()
          });

          await base44.asServiceRole.entities.AlertEvent.create({
            org_id: job.org_id,
            alert_type: 'SLA_BREACH',
            alert_key: breachKey,
            title: 'SLA Breach',
            message: `Job "${job.title}" has breached its SLA`,
            deep_link: `/jobs/${job.id}`,
            severity: 'critical'
          });

          alertsGenerated.push({
            job_id: job.id,
            job_title: job.title,
            minutes_remaining: minutesRemaining,
            breached: true
          });
        }
      }
    }

    return Response.json({
      success: true,
      jobs_checked: jobs.length,
      alerts_generated: alertsGenerated.length,
      alerts: alertsGenerated
    });

  } catch (error) {
    console.error('checkSLAAlerts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});