import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { requirePermission } from './rbacCheck.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC check
    requirePermission(user, 'updateJobStatus');

    const body = await req.json();
    const { job_id, status, notes } = body;

    if (!job_id || !status) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update job
    const updatedJob = await base44.asServiceRole.entities.Job.update(job_id, {
      status,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    });

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: user.org_id || 'default-org',
      user_id: user.id,
      action: 'UPDATE',
      entity_type: 'Job',
      entity_id: job_id,
      new_values: { status, notes }
    });

    return Response.json({
      success: true,
      job: updatedJob
    });

  } catch (error) {
    if (error.message.includes('Access denied')) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});