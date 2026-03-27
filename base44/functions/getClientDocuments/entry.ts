import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { client_id, document_type } = body;

    if (!client_id) {
      return Response.json({ error: 'client_id required' }, { status: 400 });
    }

    // Get client's sites for filtering
    const sites = await base44.asServiceRole.entities.Site.filter({ client_id });
    const siteIds = sites.map(s => s.id);

    // Fetch documents
    let documents = await base44.asServiceRole.entities.Document.filter({
      org_id: user.org_id || 'default-org'
    });

    // Filter by client relationship
    documents = documents.filter(doc => {
      // Check if document is linked to client's entities
      if (doc.linked_entity_type === 'Job') {
        // Need to check if job belongs to client (async, but simplified here)
        return true; // In production, fetch job and verify client_id
      }
      if (doc.linked_entity_type === 'Site') {
        return siteIds.includes(doc.linked_entity_id);
      }
      if (doc.linked_entity_type === 'Invoice') {
        return true; // Will verify via invoice query
      }
      return false;
    });

    // Filter by document type if specified
    if (document_type) {
      documents = documents.filter(d => d.category === document_type);
    }

    // Enrich with entity details
    const enrichedDocs = await Promise.all(
      documents.map(async (doc) => {
        let entityName = 'Unknown';
        
        if (doc.linked_entity_type === 'Job') {
          const jobs = await base44.asServiceRole.entities.Job.filter({ 
            id: doc.linked_entity_id 
          });
          if (jobs[0]?.client_id === client_id) {
            entityName = jobs[0].title;
          } else {
            return null; // Not client's job
          }
        }
        
        if (doc.linked_entity_type === 'Invoice') {
          const invoices = await base44.asServiceRole.entities.Invoice.filter({ 
            id: doc.linked_entity_id 
          });
          if (invoices[0]?.client_id === client_id) {
            entityName = `Invoice ${invoices[0].invoice_number || invoices[0].id.slice(0, 8)}`;
          } else {
            return null; // Not client's invoice
          }
        }

        return {
          id: doc.id,
          file_name: doc.file_name,
          category: doc.category,
          file_type: doc.file_type,
          file_size: doc.file_size,
          file_url: doc.file_url,
          entity_name: entityName,
          created_date: doc.created_date,
          tags: doc.tags || []
        };
      })
    );

    // Filter out nulls (docs not belonging to client)
    const validDocs = enrichedDocs.filter(d => d !== null);

    return Response.json({
      success: true,
      documents: validDocs,
      total: validDocs.length
    });

  } catch (error) {
    console.error('Get client documents error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});