import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      client_id, 
      site_id, 
      title, 
      description, 
      priority = 'medium',
      contact_name,
      contact_phone,
      preferred_date,
      attachments = []
    } = body;

    if (!client_id || !site_id || !title) {
      return Response.json({ 
        error: 'client_id, site_id, and title required' 
      }, { status: 400 });
    }

    // Generate request number
    const requests = await base44.asServiceRole.entities.Request.filter({
      org_id: user.org_id || 'default-org'
    });
    const requestNumber = `REQ-${String(requests.length + 1).padStart(5, '0')}`;

    // Create request
    const request = await base44.asServiceRole.entities.Request.create({
      org_id: user.org_id || 'default-org',
      request_number: requestNumber,
      client_id,
      site_id,
      title,
      description,
      priority,
      status: 'pending',
      requested_by: user.id,
      contact_name: contact_name || user.full_name,
      contact_phone: contact_phone || user.phone,
      preferred_date,
      attachments
    });

    // Log portal activity
    await base44.asServiceRole.entities.ClientPortalActivity.create({
      client_id,
      user_id: user.id,
      action: 'raised_request',
      metadata: {
        request_id: request.id,
        request_number: requestNumber,
        title
      },
      timestamp: new Date().toISOString()
    });

    // Trigger AI Helpdesk triage (optional)
    try {
      await base44.asServiceRole.functions.invoke('aiHelpdeskTriage', {
        org_id: user.org_id || 'default-org',
        request_id: request.id
      });
    } catch (error) {
      console.error('AI triage failed:', error);
      // Continue even if triage fails
    }

    return Response.json({
      success: true,
      request: {
        id: request.id,
        request_number: requestNumber,
        status: 'pending'
      },
      message: 'Request submitted successfully. Our team will review it shortly.'
    });

  } catch (error) {
    console.error('Client request error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});