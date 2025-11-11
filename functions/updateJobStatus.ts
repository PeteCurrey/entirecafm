import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Valid status transitions
const VALID_TRANSITIONS = {
  'new': ['assigned', 'cancelled'],
  'assigned': ['on_route', 'cancelled'],
  'on_route': ['on_site', 'assigned', 'cancelled'],
  'on_site': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': []
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { jobId, newStatus, notes } = await req.json();

    if (!jobId || !newStatus) {
      return Response.json({ 
        error: 'Missing required fields: jobId, newStatus' 
      }, { status: 400 });
    }

    // Fetch job with service role (bypasses RLS for validation)
    const job = await base44.asServiceRole.entities.Job.filter({ id: jobId });
    
    if (!job || job.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const currentJob = job[0];

    // Verify org_id matches user's org
    if (currentJob.org_id !== user.org_id) {
      return Response.json({ 
        error: 'Access denied: Job belongs to different organization' 
      }, { status: 403 });
    }

    // Validate status transition
    const currentStatus = currentJob.status || 'new';
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      return Response.json({ 
        error: `Invalid status transition: ${currentStatus} → ${newStatus}`,
        allowed: allowedTransitions
      }, { status: 400 });
    }

    // PO ENFORCEMENT: Block transition to ON_SITE if PO required
    if (newStatus === 'on_site' && currentJob.quote_id) {
      // Fetch client
      const clients = await base44.asServiceRole.entities.Client.filter({ 
        id: currentJob.client_id 
      });
      const client = clients[0];

      // Fetch quote
      const quotes = await base44.asServiceRole.entities.Quote.filter({ 
        id: currentJob.quote_id 
      });
      const quote = quotes[0];

      // Enforce PO requirement
      if (client?.requires_po && !quote?.po_number_provided) {
        return Response.json({ 
          error: 'PO_REQUIRED',
          message: 'Client requires Purchase Order. Quote must have PO before job can start.',
          client: client.name,
          quoteId: currentJob.quote_id
        }, { status: 400 });
      }
    }

    // Build update data
    const updateData = {
      status: newStatus,
      updated_date: new Date().toISOString()
    };

    // Add completion timestamp if completing
    if (newStatus === 'completed') {
      updateData.completed_date = new Date().toISOString();
    }

    // Add notes if provided
    if (notes) {
      const existingNotes = currentJob.notes || [];
      updateData.notes = [
        ...existingNotes,
        {
          text: notes,
          created_by: user.id,
          created_at: new Date().toISOString()
        }
      ];
    }

    // Update job with service role
    await base44.asServiceRole.entities.Job.update(jobId, updateData);

    // CREATE AUDIT LOG
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: user.org_id,
      user_id: user.id,
      action: 'UPDATE',
      entity_type: 'Job',
      entity_id: jobId,
      old_values: { status: currentStatus },
      new_values: { status: newStatus },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    });

    // TODO: Emit domain event for notifications
    // This would trigger engineer notifications, client updates, etc.

    return Response.json({
      success: true,
      jobId,
      oldStatus: currentStatus,
      newStatus,
      message: `Job status updated: ${currentStatus} → ${newStatus}`
    });

  } catch (error) {
    console.error('Job Status Update Error:', error);
    return Response.json({ 
      error: 'Failed to update job status',
      details: error.message 
    }, { status: 500 });
  }
});