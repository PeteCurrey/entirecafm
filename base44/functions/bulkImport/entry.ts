import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

async function publishProgress(channel, data) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  
  try {
    await fetch(`${REDIS_URL}/publish/${channel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

async function parseCSVFromUrl(fileUrl) {
  const response = await fetch(fileUrl);
  const text = await response.text();
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const parseRow = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const rows = lines.slice(1).map(line => parseRow(line));
  
  return { headers, rows };
}

function getRowValue(row, headers, field) {
  const idx = headers.indexOf(field);
  return idx !== -1 ? row[idx]?.trim() : null;
}

// Import handlers for each entity type
async function importClients(base44, orgId, headers, rows, progressChannel) {
  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    users_created: 0,
    users_linked_existing: 0,
    users_skipped: 0
  };

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const clientId = getRowValue(row, headers, 'client_id');
      const companyName = getRowValue(row, headers, 'company_name');
      const contactName = getRowValue(row, headers, 'contact_name');
      const contactEmail = getRowValue(row, headers, 'contact_email')?.toLowerCase();
      const contactPhone = getRowValue(row, headers, 'contact_phone');
      const billingAddress = getRowValue(row, headers, 'billing_address');
      const status = getRowValue(row, headers, 'status')?.toLowerCase() || 'active';
      const notes = getRowValue(row, headers, 'notes');

      if (!companyName) {
        result.errors.push({ row: i + 2, message: 'Missing company_name' });
        result.skipped++;
        continue;
      }

      // Check for existing client by client_id or company_name + email
      let existingClient = null;
      if (clientId) {
        const byId = await base44.asServiceRole.entities.Client.filter({ 
          org_id: orgId, 
          name: companyName 
        });
        existingClient = byId.find(c => c.name === companyName);
      }
      
      if (!existingClient && contactEmail) {
        const byEmail = await base44.asServiceRole.entities.Client.filter({ 
          org_id: orgId, 
          primary_contact_email: contactEmail 
        });
        existingClient = byEmail[0];
      }

      const clientData = {
        org_id: orgId,
        name: companyName,
        primary_contact_name: contactName,
        primary_contact_email: contactEmail,
        primary_contact_phone: contactPhone,
        billing_address: billingAddress,
        status: ['active', 'inactive', 'suspended'].includes(status) ? status : 'active'
      };

      let client;
      if (existingClient) {
        client = await base44.asServiceRole.entities.Client.update(existingClient.id, clientData);
        result.updated++;
      } else {
        client = await base44.asServiceRole.entities.Client.create(clientData);
        result.created++;
      }

      // Auto-create client portal user
      if (contactEmail) {
        try {
          // Check if user already exists
          const existingUsers = await base44.asServiceRole.entities.User.list();
          const existingUser = existingUsers.find(u => u.email?.toLowerCase() === contactEmail);

          if (existingUser) {
            // Link existing user to client if not already linked
            if (!existingUser.client_id || existingUser.client_id !== client.id) {
              await base44.asServiceRole.entities.User.update(existingUser.id, {
                client_id: client.id,
                role: existingUser.role || 'client'
              });
            }
            result.users_linked_existing++;
          } else {
            // Create new client portal user
            // Note: In Base44, we create a ClientUser entity and send invite
            await base44.asServiceRole.entities.ClientUser.create({
              client_id: client.id,
              email: contactEmail,
              name: contactName || companyName,
              role: 'CLIENT_ADMIN',
              active: true
            });

            // Send invitation email
            await base44.integrations.Core.SendEmail({
              to: contactEmail,
              subject: 'Your Client Portal Access — EntireCAFM',
              body: `
Hi ${contactName || companyName},

We've created your client portal access for EntireCAFM.

You can use the link below to access your portal and view your jobs, quotes, and invoices:

${typeof window !== 'undefined' ? window.location.origin : 'https://app.entirecafm.com'}/ClientPortal

If you have any questions, please contact your account manager.

Best regards,
The EntireCAFM Team
              `.trim()
            });

            result.users_created++;
          }
        } catch (userError) {
          console.error('User creation error:', userError);
          result.users_skipped++;
        }
      } else {
        result.users_skipped++;
      }

      // Progress update
      if (i % 5 === 0 || i === rows.length - 1) {
        await publishProgress(progressChannel, {
          type: 'import_progress',
          progress: Math.round(((i + 1) / rows.length) * 100),
          current: i + 1,
          total: rows.length
        });
      }
    } catch (error) {
      console.error(`Error importing row ${i + 2}:`, error);
      result.errors.push({ row: i + 2, message: error.message });
      result.skipped++;
    }
  }

  return result;
}

async function importSites(base44, orgId, headers, rows, progressChannel) {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] };
  const clientCache = new Map();

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const siteName = getRowValue(row, headers, 'site_name');
      const clientId = getRowValue(row, headers, 'client_id');
      const address1 = getRowValue(row, headers, 'address_line_1');
      const address2 = getRowValue(row, headers, 'address_line_2');
      const city = getRowValue(row, headers, 'city');
      const postcode = getRowValue(row, headers, 'postcode');
      const country = getRowValue(row, headers, 'country') || 'UK';
      const contactName = getRowValue(row, headers, 'contact_name');
      const contactEmail = getRowValue(row, headers, 'contact_email');
      const contactPhone = getRowValue(row, headers, 'contact_phone');
      const status = getRowValue(row, headers, 'status')?.toLowerCase();

      if (!siteName) {
        result.errors.push({ row: i + 2, message: 'Missing site_name' });
        result.skipped++;
        continue;
      }

      // Resolve client_id
      let resolvedClientId = null;
      if (clientId) {
        if (!clientCache.has(clientId)) {
          const clients = await base44.asServiceRole.entities.Client.filter({ org_id: orgId });
          const found = clients.find(c => c.name === clientId || c.id === clientId);
          clientCache.set(clientId, found?.id || null);
        }
        resolvedClientId = clientCache.get(clientId);
      }

      if (!resolvedClientId) {
        // Use first client or create default
        const clients = await base44.asServiceRole.entities.Client.filter({ org_id: orgId });
        if (clients.length > 0) {
          resolvedClientId = clients[0].id;
        } else {
          const defaultClient = await base44.asServiceRole.entities.Client.create({
            org_id: orgId,
            name: 'Default Client',
            status: 'active'
          });
          resolvedClientId = defaultClient.id;
        }
      }

      // Check for existing site
      const existingSites = await base44.asServiceRole.entities.Site.filter({
        org_id: orgId,
        name: siteName,
        client_id: resolvedClientId
      });

      const siteData = {
        org_id: orgId,
        client_id: resolvedClientId,
        name: siteName,
        address: [address1, address2].filter(Boolean).join(', '),
        city,
        postcode,
        country,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        is_active: status !== 'inactive'
      };

      if (existingSites.length > 0) {
        await base44.asServiceRole.entities.Site.update(existingSites[0].id, siteData);
        result.updated++;
      } else {
        await base44.asServiceRole.entities.Site.create(siteData);
        result.created++;
      }

      if (i % 5 === 0 || i === rows.length - 1) {
        await publishProgress(progressChannel, {
          type: 'import_progress',
          progress: Math.round(((i + 1) / rows.length) * 100)
        });
      }
    } catch (error) {
      result.errors.push({ row: i + 2, message: error.message });
      result.skipped++;
    }
  }

  return result;
}

async function importAssets(base44, orgId, headers, rows, progressChannel) {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] };
  const siteCache = new Map();

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const assetName = getRowValue(row, headers, 'asset_id') || getRowValue(row, headers, 'name');
      const siteId = getRowValue(row, headers, 'site_id');
      const building = getRowValue(row, headers, 'building');
      const location = getRowValue(row, headers, 'location');
      const category = getRowValue(row, headers, 'category')?.toLowerCase();
      const make = getRowValue(row, headers, 'make');
      const model = getRowValue(row, headers, 'model');
      const serialNumber = getRowValue(row, headers, 'serial_number');
      const installDate = getRowValue(row, headers, 'install_date');
      const nextServiceDate = getRowValue(row, headers, 'next_service_date');

      if (!siteId && !category) {
        result.errors.push({ row: i + 2, message: 'Missing site_id or category' });
        result.skipped++;
        continue;
      }

      // Resolve site_id
      let resolvedSiteId = null;
      if (siteId) {
        if (!siteCache.has(siteId)) {
          const sites = await base44.asServiceRole.entities.Site.filter({ org_id: orgId });
          const found = sites.find(s => s.name === siteId || s.id === siteId);
          siteCache.set(siteId, found?.id || null);
        }
        resolvedSiteId = siteCache.get(siteId);
      }

      if (!resolvedSiteId) {
        const sites = await base44.asServiceRole.entities.Site.filter({ org_id: orgId });
        resolvedSiteId = sites[0]?.id;
      }

      if (!resolvedSiteId) {
        result.errors.push({ row: i + 2, message: 'Could not resolve site' });
        result.skipped++;
        continue;
      }

      // Check for existing asset by serial number or name
      let existingAsset = null;
      if (serialNumber) {
        const bySerial = await base44.asServiceRole.entities.Asset.filter({
          org_id: orgId,
          serial_number: serialNumber
        });
        existingAsset = bySerial[0];
      }

      const assetData = {
        org_id: orgId,
        site_id: resolvedSiteId,
        name: assetName || `${category}-${Date.now()}`,
        asset_type: category || 'other',
        manufacturer: make,
        model,
        serial_number: serialNumber,
        location_description: [building, location].filter(Boolean).join(' - '),
        installation_date: installDate ? new Date(installDate).toISOString().split('T')[0] : null,
        last_service_date: nextServiceDate ? new Date(nextServiceDate).toISOString().split('T')[0] : null,
        is_active: true
      };

      if (existingAsset) {
        await base44.asServiceRole.entities.Asset.update(existingAsset.id, assetData);
        result.updated++;
      } else {
        await base44.asServiceRole.entities.Asset.create(assetData);
        result.created++;
      }

      if (i % 5 === 0 || i === rows.length - 1) {
        await publishProgress(progressChannel, {
          type: 'import_progress',
          progress: Math.round(((i + 1) / rows.length) * 100)
        });
      }
    } catch (error) {
      result.errors.push({ row: i + 2, message: error.message });
      result.skipped++;
    }
  }

  return result;
}

async function importJobs(base44, orgId, headers, rows, progressChannel) {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] };
  const siteCache = new Map();
  const clientCache = new Map();

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const description = getRowValue(row, headers, 'description');
      const jobType = getRowValue(row, headers, 'job_type')?.toLowerCase() || 'reactive';
      const priority = getRowValue(row, headers, 'priority')?.toLowerCase() || 'medium';
      const status = getRowValue(row, headers, 'status')?.toLowerCase() || 'new';
      const siteId = getRowValue(row, headers, 'site_id');
      const clientId = getRowValue(row, headers, 'client_id');
      const scheduledFor = getRowValue(row, headers, 'scheduled_for');
      const poNumber = getRowValue(row, headers, 'po_number');
      const reference = getRowValue(row, headers, 'reference');

      if (!description) {
        result.errors.push({ row: i + 2, message: 'Missing description' });
        result.skipped++;
        continue;
      }

      // Resolve IDs
      let resolvedSiteId = null;
      let resolvedClientId = null;

      if (siteId) {
        if (!siteCache.has(siteId)) {
          const sites = await base44.asServiceRole.entities.Site.filter({ org_id: orgId });
          const found = sites.find(s => s.name === siteId || s.id === siteId);
          siteCache.set(siteId, found);
        }
        const site = siteCache.get(siteId);
        resolvedSiteId = site?.id;
        resolvedClientId = site?.client_id;
      }

      if (!resolvedClientId && clientId) {
        if (!clientCache.has(clientId)) {
          const clients = await base44.asServiceRole.entities.Client.filter({ org_id: orgId });
          const found = clients.find(c => c.name === clientId || c.id === clientId);
          clientCache.set(clientId, found?.id);
        }
        resolvedClientId = clientCache.get(clientId);
      }

      // Fallback to first available
      if (!resolvedSiteId || !resolvedClientId) {
        const sites = await base44.asServiceRole.entities.Site.filter({ org_id: orgId });
        if (sites.length > 0) {
          resolvedSiteId = resolvedSiteId || sites[0].id;
          resolvedClientId = resolvedClientId || sites[0].client_id;
        }
      }

      if (!resolvedSiteId || !resolvedClientId) {
        result.errors.push({ row: i + 2, message: 'Could not resolve site/client' });
        result.skipped++;
        continue;
      }

      const jobData = {
        org_id: orgId,
        client_id: resolvedClientId,
        site_id: resolvedSiteId,
        title: description.substring(0, 100),
        description,
        job_type: ['reactive', 'ppm', 'project', 'inspection'].includes(jobType) ? jobType : 'reactive',
        priority: ['low', 'medium', 'high', 'critical', 'emergency'].includes(priority) ? priority : 'medium',
        status: ['new', 'assigned', 'en_route', 'on_site', 'completed', 'cancelled'].includes(status) ? status : 'new',
        scheduled_date: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        po_number: poNumber
      };

      await base44.asServiceRole.entities.Job.create(jobData);
      result.created++;

      if (i % 5 === 0 || i === rows.length - 1) {
        await publishProgress(progressChannel, {
          type: 'import_progress',
          progress: Math.round(((i + 1) / rows.length) * 100)
        });
      }
    } catch (error) {
      result.errors.push({ row: i + 2, message: error.message });
      result.skipped++;
    }
  }

  return result;
}

async function importParts(base44, orgId, headers, rows, progressChannel) {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const partCode = getRowValue(row, headers, 'part_code');
      const partName = getRowValue(row, headers, 'part_name');
      const description = getRowValue(row, headers, 'description');
      const unitCost = parseFloat(getRowValue(row, headers, 'unit_cost')) || 0;
      const stockQuantity = parseInt(getRowValue(row, headers, 'stock_quantity')) || 0;
      const reorderLevel = parseInt(getRowValue(row, headers, 'reorder_level')) || 0;
      const supplierName = getRowValue(row, headers, 'supplier_name');

      if (!partName) {
        result.errors.push({ row: i + 2, message: 'Missing part_name' });
        result.skipped++;
        continue;
      }

      // Check for existing part by part_code
      let existingPart = null;
      if (partCode) {
        const byCode = await base44.asServiceRole.entities.Part.filter({
          org_id: orgId,
          part_number: partCode
        });
        existingPart = byCode[0];
      }

      const partData = {
        org_id: orgId,
        name: partName,
        part_number: partCode,
        notes: description,
        unit_cost: unitCost,
        stock_quantity: stockQuantity,
        reorder_level: reorderLevel,
        supplier: supplierName
      };

      if (existingPart) {
        await base44.asServiceRole.entities.Part.update(existingPart.id, partData);
        result.updated++;
      } else {
        await base44.asServiceRole.entities.Part.create(partData);
        result.created++;
      }

      if (i % 5 === 0 || i === rows.length - 1) {
        await publishProgress(progressChannel, {
          type: 'import_progress',
          progress: Math.round(((i + 1) / rows.length) * 100)
        });
      }
    } catch (error) {
      result.errors.push({ row: i + 2, message: error.message });
      result.skipped++;
    }
  }

  return result;
}

async function importEngineers(base44, orgId, headers, rows, progressChannel) {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const fullName = getRowValue(row, headers, 'full_name');
      const email = getRowValue(row, headers, 'email')?.toLowerCase();
      const phone = getRowValue(row, headers, 'phone');
      const baseLocation = getRowValue(row, headers, 'base_location');
      const skills = getRowValue(row, headers, 'skills');
      const employmentType = getRowValue(row, headers, 'employment_type')?.toLowerCase();
      const status = getRowValue(row, headers, 'status')?.toLowerCase();

      if (!fullName || !email) {
        result.errors.push({ row: i + 2, message: 'Missing full_name or email' });
        result.skipped++;
        continue;
      }

      // Check for existing user by email
      const existingUsers = await base44.asServiceRole.entities.User.list();
      const existingUser = existingUsers.find(u => u.email?.toLowerCase() === email);

      if (existingUser) {
        // Update existing user
        await base44.asServiceRole.entities.User.update(existingUser.id, {
          full_name: fullName,
          role: 'engineer',
          org_id: orgId
        });
        result.updated++;
      } else {
        // For engineers, we create a Contractor entity as a record
        // (actual user creation requires invite flow)
        await base44.asServiceRole.entities.Contractor.create({
          org_id: orgId,
          company_name: fullName,
          primary_contact_name: fullName,
          primary_contact_email: email,
          primary_contact_phone: phone,
          specialties: skills?.split(',').map(s => s.trim()) || [],
          status: status === 'inactive' ? 'inactive' : 'active'
        });
        result.created++;
      }

      if (i % 5 === 0 || i === rows.length - 1) {
        await publishProgress(progressChannel, {
          type: 'import_progress',
          progress: Math.round(((i + 1) / rows.length) * 100)
        });
      }
    } catch (error) {
      result.errors.push({ row: i + 2, message: error.message });
      result.skipped++;
    }
  }

  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { org_id, entity_type, file_url } = body;

    if (!org_id || !entity_type || !file_url) {
      return Response.json({ error: 'org_id, entity_type, and file_url required' }, { status: 400 });
    }

    console.log(`🚀 Bulk import: ${entity_type} for org ${org_id}`);

    // Parse CSV
    const { headers, rows } = await parseCSVFromUrl(file_url);
    
    if (rows.length === 0) {
      return Response.json({ error: 'No data rows found in CSV' }, { status: 400 });
    }

    console.log(`📦 Importing ${rows.length} rows of ${entity_type}`);

    const progressChannel = `import.org.${org_id}`;
    let result;

    // Route to appropriate handler
    switch (entity_type) {
      case 'clients':
        result = await importClients(base44, org_id, headers, rows, progressChannel);
        break;
      case 'sites':
        result = await importSites(base44, org_id, headers, rows, progressChannel);
        break;
      case 'assets':
        result = await importAssets(base44, org_id, headers, rows, progressChannel);
        break;
      case 'jobs':
        result = await importJobs(base44, org_id, headers, rows, progressChannel);
        break;
      case 'parts':
        result = await importParts(base44, org_id, headers, rows, progressChannel);
        break;
      case 'engineers':
        result = await importEngineers(base44, org_id, headers, rows, progressChannel);
        break;
      default:
        return Response.json({ error: `Unknown entity type: ${entity_type}` }, { status: 400 });
    }

    console.log(`✅ Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'BulkImport',
      entity_id: `bulk-${entity_type}-${Date.now()}`,
      new_values: {
        entity_type,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors_count: result.errors?.length || 0,
        users_created: result.users_created || 0
      }
    });

    return Response.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('bulkImport error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});