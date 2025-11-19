import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Schema definitions for entity mapping
const ENTITY_SCHEMAS = {
  Job: {
    fields: ['title', 'description', 'job_type', 'priority', 'status', 'site_id', 'asset_id', 'scheduled_date', 'po_number'],
    required: ['title', 'job_type'],
    fuzzyMatches: {
      title: ['job_title', 'task', 'work_order', 'fault'],
      description: ['details', 'notes', 'issue', 'problem'],
      job_type: ['type', 'category', 'work_type'],
      priority: ['urgency', 'importance'],
      status: ['state', 'job_status'],
      scheduled_date: ['date', 'schedule', 'due_date']
    }
  },
  Asset: {
    fields: ['name', 'site_id', 'asset_type', 'manufacturer', 'model', 'serial_number', 'installation_date'],
    required: ['name', 'asset_type'],
    fuzzyMatches: {
      name: ['asset_name', 'equipment', 'asset_id'],
      asset_type: ['type', 'category', 'equipment_type'],
      manufacturer: ['make', 'brand'],
      model: ['model_number'],
      serial_number: ['serial', 'sn'],
      installation_date: ['install_date', 'commissioned']
    }
  },
  Site: {
    fields: ['name', 'address', 'city', 'postcode', 'contact_name', 'contact_phone', 'contact_email'],
    required: ['name', 'address'],
    fuzzyMatches: {
      name: ['site_name', 'location', 'property'],
      address: ['street', 'address_line_1'],
      city: ['town'],
      postcode: ['zip', 'postal_code'],
      contact_name: ['site_contact', 'manager'],
      contact_phone: ['phone', 'telephone'],
      contact_email: ['email']
    }
  },
  User: {
    fields: ['full_name', 'email', 'phone', 'role'],
    required: ['full_name', 'email'],
    fuzzyMatches: {
      full_name: ['name', 'engineer_name', 'technician'],
      email: ['email_address'],
      phone: ['telephone', 'mobile'],
      role: ['position', 'job_title']
    }
  },
  Part: {
    fields: ['name', 'part_number', 'supplier', 'unit_cost', 'stock_quantity', 'category'],
    required: ['name'],
    fuzzyMatches: {
      name: ['part_name', 'description', 'item'],
      part_number: ['sku', 'code', 'part_code'],
      supplier: ['vendor', 'manufacturer'],
      unit_cost: ['price', 'cost', 'unit_price'],
      stock_quantity: ['quantity', 'stock', 'qty'],
      category: ['type', 'part_type']
    }
  }
};

function normalizeHeader(header) {
  return header.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
}

function fuzzyMatchField(header, schema) {
  const normalized = normalizeHeader(header);
  
  // Direct match
  for (const field of schema.fields) {
    if (normalized === field) return field;
  }
  
  // Fuzzy match
  for (const [targetField, aliases] of Object.entries(schema.fuzzyMatches || {})) {
    if (aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))) {
      return targetField;
    }
  }
  
  return null;
}

function inferEntityType(headers) {
  const normalized = headers.map(h => normalizeHeader(h));
  const scores = {};
  
  for (const [entityName, schema] of Object.entries(ENTITY_SCHEMAS)) {
    let score = 0;
    for (const header of normalized) {
      if (fuzzyMatchField(header, schema)) {
        score += 1;
      }
    }
    scores[entityName] = score;
  }
  
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : null;
}

async function parseCSVFromUrl(fileUrl) {
  const response = await fetch(fileUrl);
  const text = await response.text();
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length === 0) return [];
  
  const rows = lines.map(line => {
    // Simple CSV parsing (handles quoted fields)
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
    const { org_id, file_url, sheets_url } = body;

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    console.log(`📊 Analyzing data import for org: ${org_id}`);

    let dataUrl = file_url;
    
    // Handle Google Sheets
    if (sheets_url) {
      // Convert Google Sheets URL to CSV export URL
      const sheetId = sheets_url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      if (!sheetId) {
        return Response.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
      }
      dataUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    }

    if (!dataUrl) {
      return Response.json({ error: 'file_url or sheets_url required' }, { status: 400 });
    }

    // Parse CSV
    const rows = await parseCSVFromUrl(dataUrl);
    
    if (rows.length < 2) {
      return Response.json({ error: 'File must contain headers and at least one data row' }, { status: 400 });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    console.log(`📋 Headers: ${headers.join(', ')}`);
    console.log(`📊 Data rows: ${dataRows.length}`);

    // Infer entity type
    const entityType = inferEntityType(headers);
    
    if (!entityType) {
      return Response.json({ 
        error: 'Could not determine data type. Please use a template or ensure headers match expected fields.' 
      }, { status: 400 });
    }

    const schema = ENTITY_SCHEMAS[entityType];
    
    // Build field mapping
    const mapping = {};
    const mappedFields = new Set();
    
    for (const header of headers) {
      const targetField = fuzzyMatchField(header, schema);
      if (targetField) {
        mapping[targetField] = header;
        mappedFields.add(targetField);
      }
    }

    // Check if required fields are mapped
    const missingRequired = schema.required.filter(field => !mappedFields.has(field));
    if (missingRequired.length > 0) {
      return Response.json({ 
        error: `Missing required fields for ${entityType}: ${missingRequired.join(', ')}` 
      }, { status: 400 });
    }

    // Calculate confidence score
    const confidenceScore = Math.round((mappedFields.size / schema.fields.length) * 100);

    console.log(`✅ Detected entity: ${entityType} (${confidenceScore}% confidence)`);

    return Response.json({
      success: true,
      entity_type: entityType,
      mapping: { [entityType]: mapping },
      confidence_score: confidenceScore,
      total_rows: dataRows.length,
      preview_data: rows.slice(0, 6),
      file_url: dataUrl
    });

  } catch (error) {
    console.error('aiDataImport error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});