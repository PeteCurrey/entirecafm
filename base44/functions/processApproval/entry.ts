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
      console.log(`✅ Published approval update to ${channel}`);
    }
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can process approvals
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { approval_id, action, rejection_reason } = await req.json();

    if (!approval_id || !action) {
      return Response.json({ 
        error: 'approval_id and action (approve/reject) are required' 
      }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return Response.json({ 
        error: 'action must be either "approve" or "reject"' 
      }, { status: 400 });
    }

    if (action === 'reject' && !rejection_reason) {
      return Response.json({ 
        error: 'rejection_reason is required when rejecting' 
      }, { status: 400 });
    }

    const org_id = user.org_id || 'default-org';

    // Fetch approval
    const approval = await base44.entities.Approval.get(approval_id);
    
    if (!approval) {
      return Response.json({ error: 'Approval not found' }, { status: 404 });
    }

    if (approval.org_id !== org_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (approval.status !== 'pending') {
      return Response.json({ 
        error: 'Approval already processed',
        current_status: approval.status 
      }, { status: 400 });
    }

    // Prepare update
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_by: user.id,
      approved_date: new Date().toISOString(),
    };

    if (action === 'reject') {
      updateData.rejection_reason = rejection_reason;
    }

    // Update approval
    const updatedApproval = await base44.asServiceRole.entities.Approval.update(
      approval_id, 
      updateData
    );

    // Update linked entities based on approval type
    if (action === 'approve') {
      if (approval.approval_type === 'quote' && approval.linked_entity_id) {
        await base44.asServiceRole.entities.Quote.update(approval.linked_entity_id, {
          status: 'ready_to_schedule',
          internal_approved_by: user.id,
          internal_approved_date: new Date().toISOString(),
        });
      }

      if (approval.approval_type === 'job_completion' && approval.linked_entity_id) {
        await base44.asServiceRole.entities.Job.update(approval.linked_entity_id, {
          approved_by: user.id,
          approved_date: new Date().toISOString(),
        });
      }
    }

    // Publish to Redis
    const publishPayload = {
      type: 'approval_processed',
      approval: {
        id: approval_id,
        status: updateData.status,
        approval_type: approval.approval_type,
        linked_entity_id: approval.linked_entity_id,
        approved_by: user.full_name,
        action,
      },
      timestamp: new Date().toISOString(),
    };

    await publishToRedis(`approvals.org.${org_id}`, publishPayload);

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: action === 'approve' ? 'APPROVE' : 'REJECT',
      entity_type: 'Approval',
      entity_id: approval_id,
      old_values: { status: 'pending' },
      new_values: updateData,
    });

    return Response.json({ 
      success: true, 
      approval: updatedApproval,
      action,
      published: !!REDIS_URL 
    });

  } catch (error) {
    console.error('processApproval error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});