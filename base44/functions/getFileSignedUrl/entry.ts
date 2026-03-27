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
    const { documentId, expiresIn = 300 } = await req.json();

    if (!documentId) {
      return Response.json({ 
        error: 'Missing documentId' 
      }, { status: 400 });
    }

    // Fetch document with service role
    const documents = await base44.asServiceRole.entities.Document.filter({ 
      id: documentId 
    });

    if (!documents || documents.length === 0) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const document = documents[0];

    // Verify org_id matches user's org (access control)
    if (document.org_id !== user.org_id) {
      return Response.json({ 
        error: 'Access denied: Document belongs to different organization' 
      }, { status: 403 });
    }

    // Generate signed URL
    const signedUrlResult = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: document.file_url,
      expires_in: expiresIn
    });

    if (!signedUrlResult.signed_url) {
      throw new Error('Failed to generate signed URL');
    }

    // CREATE AUDIT LOG for document access
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: user.org_id,
      user_id: user.id,
      action: 'READ',
      entity_type: 'Document',
      entity_id: documentId,
      new_values: {
        action: 'download_url_generated',
        expires_in: expiresIn
      },
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      signed_url: signedUrlResult.signed_url,
      expires_in: expiresIn,
      document: {
        id: document.id,
        file_name: document.file_name,
        file_type: document.file_type,
        file_size: document.file_size
      }
    });

  } catch (error) {
    console.error('Signed URL Generation Error:', error);
    return Response.json({ 
      error: 'Failed to generate signed URL',
      details: error.message 
    }, { status: 500 });
  }
});