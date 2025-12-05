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
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      type,  // 'new_job_assignment', 'critical_alert', 'sla_warning', 'job_update'
      target_user_id,
      target_org_id,
      data 
    } = body;

    if (!type || !data) {
      return Response.json({ error: 'Missing type or data' }, { status: 400 });
    }

    const message = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    let published = false;

    // Send to specific user
    if (target_user_id) {
      published = await publishToRedis(`engineer.${target_user_id}`, message);
    }

    // Send to org-wide channel
    if (target_org_id) {
      const orgPublished = await publishToRedis(`org.${target_org_id}.alerts`, message);
      published = published || orgPublished;
    }

    // Log the notification
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: target_org_id || user.org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'PushNotification',
      entity_id: `notification-${Date.now()}`,
      new_values: {
        type,
        target_user_id,
        target_org_id,
        published
      }
    });

    return Response.json({
      success: true,
      published,
      message: published ? 'Notification sent' : 'Notification queued (Redis not available)'
    });

  } catch (error) {
    console.error('sendPushNotification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});