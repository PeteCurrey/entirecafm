import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const { 
      approval_type, 
      linked_entity_type, 
      linked_entity_id, 
      title, 
      amount, 
      priority = 'medium',
      notes 
    } = await req.json();

    // Validate required fields
    if (!approval_type || !linked_entity_id || !title) {
      return Response.json({ 
        error: 'Missing required fields: approval_type, linked_entity_id, title' 
      }, { status: 400 });
    }

    // Validate approval type
    const validTypes = ['quote', 'expense', 'job_completion', 'purchase_order', 'contractor_invoice'];
    if (!validTypes.includes(approval_type)) {
      return Response.json({ 
        error: `Invalid approval_type. Must be one of: ${validTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Create approval record (org_id enforced from token)
    const approval = await base44.asServiceRole.entities.Approval.create({
      org_id: user.org_id,
      approval_type,
      linked_entity_type: linked_entity_type || approval_type,
      linked_entity_id,
      title,
      amount: amount || null,
      requested_by: user.id,
      status: 'pending',
      priority,
      notes: notes || null
    });

    // CREATE AUDIT LOG
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: user.org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'Approval',
      entity_id: approval.id,
      new_values: {
        approval_type,
        title,
        amount,
        linked_to: `${linked_entity_type}:${linked_entity_id}`
      },
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    });

    // TODO: Emit notification event to admins
    // This would alert users with approval permissions

    return Response.json({
      success: true,
      approval: {
        id: approval.id,
        approval_type: approval.approval_type,
        title: approval.title,
        status: approval.status,
        amount: approval.amount
      },
      message: 'Approval request created successfully'
    });

  } catch (error) {
    console.error('Create Approval Error:', error);
    return Response.json({ 
      error: 'Failed to create approval',
      details: error.message 
    }, { status: 500 });
  }
});