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

// Valid status transitions
const VALID_TRANSITIONS = {
  'new': ['assigned', 'cancelled'],
  'assigned': ['on_route', 'cancelled'],
  'on_route': ['on_site', 'cancelled'],
  'on_site': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': [],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id, to_status, assigned_engineer_id, po_number } = await req.json();

    if (!job_id || !to_status) {
      return Response.json({ 
        error: 'job_id and to_status are required' 
      }, { status: 400 });
    }

    const org_id = user.org_id || 'default-org';

    // Fetch job
    const job = await base44.entities.Job.get(job_id);
    
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.org_id !== org_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate transition
    const currentStatus = job.status || 'new';
    const allowedStatuses = VALID_TRANSITIONS[currentStatus] || [];
    
    if (!allowedStatuses.includes(to_status)) {
      return Response.json({ 
        error: 'Invalid status transition',
        code: 'INVALID_TRANSITION',
        current: currentStatus,
        attempted: to_status,
        allowed: allowedStatuses
      }, { status: 400 });
    }

    // PO Enforcement: Check if transitioning to on_site
    if (to_status === 'on_site') {
      // Check if client requires PO
      const client = await base44.entities.Client.get(job.client_id);
      
      if (client && client.requires_po) {
        // Check if job has PO number
        const hasPO = job.po_number || po_number;
        
        if (!hasPO) {
          return Response.json({
            error: 'Purchase Order required before proceeding to ON_SITE',
            code: 'PO_REQUIRED',
            client: client.name
          }, { status: 403 });
        }
      }
    }

    // Prepare update data
    const updateData = {
      status: to_status,
    };

    if (assigned_engineer_id) {
      updateData.assigned_engineer_id = assigned_engineer_id;
    }

    if (po_number) {
      updateData.po_number = po_number;
    }

    if (to_status === 'completed') {
      updateData.completed_date = new Date().toISOString();
    }

    // Update job
    const updatedJob = await base44.asServiceRole.entities.Job.update(job_id, updateData);

    // Publish to Redis topics
    const jobUpdatePayload = {
      type: 'job_status_update',
      job: {
        id: job_id,
        status: to_status,
        client_id: job.client_id,
        site_id: job.site_id,
        assigned_engineer_id: updateData.assigned_engineer_id || job.assigned_engineer_id,
        priority: job.priority,
      },
      timestamp: new Date().toISOString(),
    };

    await Promise.all([
      publishToRedis(`jobs.org.${org_id}`, jobUpdatePayload),
      publishToRedis(`map.org.${org_id}`, jobUpdatePayload),
    ]);

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: 'UPDATE',
      entity_type: 'Job',
      entity_id: job_id,
      old_values: { status: currentStatus },
      new_values: updateData,
    });

    return Response.json({ 
      success: true, 
      job: updatedJob,
      published: !!REDIS_URL,
      redis_configured: !!REDIS_URL && !!REDIS_TOKEN
    });

  } catch (error) {
    console.error('updateJobStatus error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});