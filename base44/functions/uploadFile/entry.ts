import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file');
    const category = formData.get('category') || 'other';
    const linkedEntityType = formData.get('linked_entity_type');
    const linkedEntityId = formData.get('linked_entity_id');

    if (!file) {
      return Response.json({ 
        error: 'No file provided' 
      }, { status: 400 });
    }

    // Upload file using Core integration (private storage)
    const uploadResult = await base44.integrations.Core.UploadPrivateFile({
      file: file
    });

    if (!uploadResult.file_uri) {
      throw new Error('File upload failed - no URI returned');
    }

    // Create document record with service role (org_id enforced)
    const document = await base44.asServiceRole.entities.Document.create({
      org_id: user.org_id,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      file_url: uploadResult.file_uri,
      category,
      linked_entity_type: linkedEntityType,
      linked_entity_id: linkedEntityId,
      uploaded_by: user.id,
      is_public: false
    });

    // CREATE AUDIT LOG
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: user.org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'Document',
      entity_id: document.id,
      new_values: {
        file_name: file.name,
        category,
        linked_to: `${linkedEntityType}:${linkedEntityId}`
      },
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      document: {
        id: document.id,
        file_name: document.file_name,
        file_uri: document.file_url,
        category: document.category
      },
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('File Upload Error:', error);
    return Response.json({ 
      error: 'Failed to upload file',
      details: error.message 
    }, { status: 500 });
  }
});