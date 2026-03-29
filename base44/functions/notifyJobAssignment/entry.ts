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
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { job_id, engineer_id } = body;

    if (!job_id || !engineer_id) {
      return Response.json({ error: 'Missing job_id or engineer_id' }, { status: 400 });
    }

    // Get job details
    const job = await base44.asServiceRole.entities.Job.get(job_id);
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get site details if available
    let site = null;
    if (job.site_id) {
      try {
        site = await base44.asServiceRole.entities.Site.get(job.site_id);
      } catch (e) {
        console.log('Site not found:', e);
      }
    }

    // Prepare notification data
    const notificationData = {
      id: job.id,
      title: job.title,
      description: job.description,
      priority: job.priority,
      status: job.status,
      scheduled_date: job.scheduled_date,
      sla_due_date: job.sla_due_date,
      site_name: site?.name || job.site_name,
      site_address: site?.address,
      site_lat: site?.lat,
      site_lng: site?.lng,
      job_number: job.job_number
    };

    // Send real-time notification to engineer
    const message = {
      type: 'new_job_assignment',
      data: notificationData,
      timestamp: new Date().toISOString()
    };

    const published = await publishToRedis(`engineer.${engineer_id}`, message);

    // Also send to org alerts channel
    if (job.org_id) {
      await publishToRedis(`org.${job.org_id}.alerts`, {
        type: 'job_assigned',
        data: {
          job_id: job.id,
          job_title: job.title,
          engineer_id,
          message: `Job "${job.title}" assigned`
        },
        timestamp: new Date().toISOString()
      });
    }

    // Try to send email notification as well
    try {
      const engineer = await base44.asServiceRole.entities.User.get(engineer_id);
      if (engineer?.email) {
        await base44.integrations.Core.SendEmail({
          to: engineer.email,
          subject: `New Job Assigned: ${job.title}`,
          body: `
            <h2>New Job Assigned</h2>
            <p>You have been assigned a new job:</p>
            <ul>
              <li><strong>Title:</strong> ${job.title}</li>
              <li><strong>Priority:</strong> ${job.priority || 'Normal'}</li>
              <li><strong>Location:</strong> ${site?.name || 'TBC'}</li>
              <li><strong>Scheduled:</strong> ${job.scheduled_date ? new Date(job.scheduled_date).toLocaleString() : 'Not scheduled'}</li>
            </ul>
            <p>Open the EntireCAFM mobile app to view details and start work.</p>
          `
        });
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
    }

    return Response.json({
      success: true,
      published,
      notification_sent: true
    });

  } catch (error) {
    console.error('notifyJobAssignment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});