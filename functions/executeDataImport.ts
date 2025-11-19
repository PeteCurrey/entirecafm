import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

async function parseCSVFromUrl(fileUrl) {
  const response = await fetch(fileUrl);
  const text = await response.text();
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length === 0) return [];
  
  const rows = lines.map(line => {
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
  });
  
  return rows;
}

function transformRow(row, headers, mapping, orgId) {
  const data = { org_id: orgId };
  
  for (const [targetField, sourceHeader] of Object.entries(mapping)) {
    const sourceIndex = headers.indexOf(sourceHeader);
    if (sourceIndex !== -1 && row[sourceIndex]) {
      let value = row[sourceIndex].trim();
      
      // Type conversions
      if (targetField.includes('date') && value) {
        try {
          data[targetField] = new Date(value).toISOString();
        } catch {
          data[targetField] = value;
        }
      } else if (targetField === 'priority' && value) {
        data[targetField] = value.toLowerCase();
      } else if (targetField === 'status' && value) {
        data[targetField] = value.toLowerCase();
      } else if (targetField === 'job_type' && value) {
        data[targetField] = value.toLowerCase();
      } else if (targetField === 'asset_type' && value) {
        data[targetField] = value.toLowerCase();
      } else if (targetField === 'role' && value) {
        data[targetField] = value.toLowerCase();
      } else {
        data[targetField] = value;
      }
    }
  }
  
  return data;
}

async function lookupOrCreateSite(base44, orgId, siteName) {
  if (!siteName) return null;
  
  const existing = await base44.asServiceRole.entities.Site.filter({ 
    org_id: orgId, 
    name: siteName 
  });
  
  if (existing.length > 0) return existing[0].id;
  
  const newSite = await base44.asServiceRole.entities.Site.create({
    org_id: orgId,
    name: siteName,
    address: 'TBD',
    client_id: 'default'
  });
  
  return newSite.id;
}

async function lookupOrCreateAsset(base44, orgId, assetName, siteId) {
  if (!assetName) return null;
  
  const existing = await base44.asServiceRole.entities.Asset.filter({ 
    org_id: orgId, 
    name: assetName 
  });
  
  if (existing.length > 0) return existing[0].id;
  
  if (!siteId) return null;
  
  const newAsset = await base44.asServiceRole.entities.Asset.create({
    org_id: orgId,
    name: assetName,
    site_id: siteId,
    asset_type: 'other'
  });
  
  return newAsset.id;
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
    const { org_id, mapping, file_url } = body;

    if (!org_id || !mapping || !file_url) {
      return Response.json({ error: 'org_id, mapping, and file_url required' }, { status: 400 });
    }

    console.log(`🚀 Executing data import for org: ${org_id}`);

    // Parse CSV
    const rows = await parseCSVFromUrl(file_url);
    const headers = rows[0];
    const dataRows = rows.slice(1);

    const entityType = Object.keys(mapping)[0];
    const fieldMapping = mapping[entityType];

    console.log(`📦 Importing ${dataRows.length} rows into ${entityType}`);

    const imported = { [entityType]: 0 };
    const errors = [];
    const siteCache = new Map();
    const assetCache = new Map();

    // Import data
    for (let i = 0; i < dataRows.length; i++) {
      try {
        const row = dataRows[i];
        let data = transformRow(row, headers, fieldMapping, org_id);

        // Handle relationships
        if (entityType === 'Job') {
          // Lookup or create site
          const siteName = row[headers.indexOf(fieldMapping.site_id || 'site_name')];
          if (siteName) {
            if (!siteCache.has(siteName)) {
              const siteId = await lookupOrCreateSite(base44, org_id, siteName);
              siteCache.set(siteName, siteId);
            }
            data.site_id = siteCache.get(siteName);
          }

          // Lookup or create asset
          const assetName = row[headers.indexOf(fieldMapping.asset_id || 'asset_name')];
          if (assetName && data.site_id) {
            const cacheKey = `${assetName}-${data.site_id}`;
            if (!assetCache.has(cacheKey)) {
              const assetId = await lookupOrCreateAsset(base44, org_id, assetName, data.site_id);
              assetCache.set(cacheKey, assetId);
            }
            data.asset_id = assetCache.get(cacheKey);
          }

          // Add default client_id if missing
          if (!data.client_id) {
            const clients = await base44.asServiceRole.entities.Client.filter({ org_id });
            if (clients.length > 0) {
              data.client_id = clients[0].id;
            }
          }
        }

        if (entityType === 'Asset') {
          const siteName = row[headers.indexOf(fieldMapping.site_id || 'site_name')];
          if (siteName) {
            if (!siteCache.has(siteName)) {
              const siteId = await lookupOrCreateSite(base44, org_id, siteName);
              siteCache.set(siteName, siteId);
            }
            data.site_id = siteCache.get(siteName);
          }
        }

        if (entityType === 'Site') {
          // Add default client_id
          if (!data.client_id) {
            const clients = await base44.asServiceRole.entities.Client.filter({ org_id });
            if (clients.length > 0) {
              data.client_id = clients[0].id;
            } else {
              // Create a default client
              const defaultClient = await base44.asServiceRole.entities.Client.create({
                org_id,
                name: 'Default Client',
                is_active: true
              });
              data.client_id = defaultClient.id;
            }
          }
        }

        // Create entity
        await base44.asServiceRole.entities[entityType].create(data);
        imported[entityType]++;

      } catch (error) {
        console.error(`Error importing row ${i + 1}:`, error);
        errors.push({
          row: i + 1,
          error: error.message
        });
      }
    }

    console.log(`✅ Import complete: ${imported[entityType]} ${entityType} records created`);

    // Trigger post-import automations
    try {
      console.log('🔄 Triggering post-import automations...');
      
      // Refresh AI Director Dashboard
      await base44.asServiceRole.functions.invoke('aiDirectorDashboard', { org_id });
      
      // Trigger predictive asset failure scoring if assets were imported
      if (entityType === 'Asset') {
        await base44.asServiceRole.functions.invoke('pafe_computeAssetFeatures', { org_id });
      }
      
      console.log('✅ Automations triggered');
    } catch (autoError) {
      console.warn('⚠️ Automation trigger failed:', autoError);
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'DataImport',
      entity_id: `import-${Date.now()}`,
      new_values: {
        entity_type: entityType,
        rows_imported: imported[entityType],
        errors_count: errors.length
      }
    });

    return Response.json({
      success: true,
      summary: {
        imported,
        errors,
        total_rows: dataRows.length
      }
    });

  } catch (error) {
    console.error('executeDataImport error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});