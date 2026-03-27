import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { org_id, source_type, csv_url, api_endpoint, site_id, manual_data } = body;

    const orgId = org_id || user.org_id || 'default-org';

    console.log(`🌍 ESG Data Collection for org: ${orgId}, source: ${source_type}`);

    let metricsCreated = 0;
    const errors = [];

    // Handle CSV Import
    if (source_type === 'csv' && csv_url) {
      try {
        const csvResponse = await fetch(csv_url);
        const csvText = await csvResponse.text();
        
        // Parse CSV (simple implementation)
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',');
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx]?.trim();
          });

          // Expected CSV format: date, site_id, metric_type, value, notes
          if (row.metric_type && row.value) {
            try {
              await base44.asServiceRole.entities.ESGMetric.create({
                org_id: orgId,
                site_id: row.site_id || site_id || null,
                metric_type: row.metric_type,
                value: parseFloat(row.value),
                recorded_at: row.date || new Date().toISOString().split('T')[0],
                source: 'import',
                notes: row.notes || `Imported from CSV at ${new Date().toISOString()}`
              });
              metricsCreated++;
            } catch (err) {
              errors.push(`Row ${i}: ${err.message}`);
            }
          }
        }
        
        console.log(`✅ CSV Import: ${metricsCreated} metrics created`);
      } catch (error) {
        errors.push(`CSV Import Error: ${error.message}`);
      }
    }

    // Handle API Import
    if (source_type === 'api' && api_endpoint) {
      try {
        const apiResponse = await fetch(api_endpoint);
        const apiData = await apiResponse.json();
        
        // Assume API returns array of metrics
        // Format: [{ date, site_id, metric_type, value, notes }]
        if (Array.isArray(apiData)) {
          for (const metric of apiData) {
            try {
              await base44.asServiceRole.entities.ESGMetric.create({
                org_id: orgId,
                site_id: metric.site_id || site_id || null,
                metric_type: metric.metric_type,
                value: parseFloat(metric.value),
                recorded_at: metric.date || new Date().toISOString().split('T')[0],
                source: 'sensor',
                notes: metric.notes || `Imported from API at ${new Date().toISOString()}`
              });
              metricsCreated++;
            } catch (err) {
              errors.push(`API Metric: ${err.message}`);
            }
          }
        }
        
        console.log(`✅ API Import: ${metricsCreated} metrics created`);
      } catch (error) {
        errors.push(`API Import Error: ${error.message}`);
      }
    }

    // Handle Manual Entry
    if (source_type === 'manual' && manual_data) {
      try {
        if (Array.isArray(manual_data)) {
          for (const metric of manual_data) {
            try {
              await base44.asServiceRole.entities.ESGMetric.create({
                org_id: orgId,
                site_id: metric.site_id || site_id || null,
                metric_type: metric.metric_type,
                value: parseFloat(metric.value),
                recorded_at: metric.date || new Date().toISOString().split('T')[0],
                source: 'manual',
                notes: metric.notes || 'Manual entry'
              });
              metricsCreated++;
            } catch (err) {
              errors.push(`Manual Entry: ${err.message}`);
            }
          }
        } else {
          // Single metric
          await base44.asServiceRole.entities.ESGMetric.create({
            org_id: orgId,
            site_id: manual_data.site_id || site_id || null,
            metric_type: manual_data.metric_type,
            value: parseFloat(manual_data.value),
            recorded_at: manual_data.date || new Date().toISOString().split('T')[0],
            source: 'manual',
            notes: manual_data.notes || 'Manual entry'
          });
          metricsCreated++;
        }
        
        console.log(`✅ Manual Entry: ${metricsCreated} metrics created`);
      } catch (error) {
        errors.push(`Manual Entry Error: ${error.message}`);
      }
    }

    // Trigger sustainability analyzer if metrics were added
    if (metricsCreated > 0) {
      console.log('🔄 Triggering sustainability analyzer...');
      try {
        await base44.asServiceRole.functions.invoke('sustainabilityAnalyzer', {
          org_id: orgId
        });
        console.log('✅ Sustainability scores updated');
      } catch (error) {
        console.error('Failed to trigger analyzer:', error);
        errors.push(`Analyzer Trigger: ${error.message}`);
      }
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: orgId,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'ESGMetric',
      entity_id: `bulk-${Date.now()}`,
      new_values: {
        metrics_created: metricsCreated,
        source_type
      }
    });

    return Response.json({
      success: true,
      metrics_created: metricsCreated,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    console.error('ESG Collector error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});