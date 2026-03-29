import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const assetId = formData.get('asset_id');
    const requirementId = formData.get('requirement_id');
    const orgId = user.org_id || 'default-org';

    if (!file || !assetId || !requirementId) {
      return Response.json({ 
        error: 'Missing required fields: file, asset_id, requirement_id' 
      }, { status: 400 });
    }

    console.log(`📄 Uploading certificate for asset: ${assetId}`);

    // Upload file to storage
    const uploadResult = await base44.integrations.Core.UploadFile({ file });
    const certificateUrl = uploadResult.file_url;

    console.log(`✅ Certificate uploaded: ${certificateUrl}`);

    // OCR extraction using AI
    const ocrPrompt = `
Extract the following information from this compliance certificate:
- Expiry Date (format: YYYY-MM-DD)
- Test Type (e.g., Gas Safety, PAT, Fire Alarm, etc.)
- Result/Status (PASS or FAIL)
- Tester Name
- Certificate Number

Return as JSON with keys: expiry_date, test_type, status, tester_name, certificate_number.
If any field is not found, set to null.
`;

    const ocrResult = await base44.integrations.Core.InvokeLLM({
      prompt: ocrPrompt,
      file_urls: [certificateUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          expiry_date: { type: 'string' },
          test_type: { type: 'string' },
          status: { type: 'string' },
          tester_name: { type: 'string' },
          certificate_number: { type: 'string' }
        }
      }
    });

    console.log('📊 OCR Results:', ocrResult);

    // Calculate next due date based on requirement frequency
    const requirement = await base44.asServiceRole.entities.ComplianceRequirement.filter({
      id: requirementId
    });

    let nextDueDate = new Date();
    if (requirement.length > 0 && requirement[0].frequency_days) {
      nextDueDate = new Date(new Date().getTime() + (requirement[0].frequency_days * 24 * 60 * 60 * 1000));
    } else if (ocrResult.expiry_date) {
      nextDueDate = new Date(ocrResult.expiry_date);
    }

    // Get asset and site info
    const asset = await base44.asServiceRole.entities.Asset.filter({ id: assetId });
    const siteId = asset.length > 0 ? asset[0].site_id : null;

    // Create or update compliance record
    const existingRecords = await base44.asServiceRole.entities.ComplianceRecord.filter({
      org_id: orgId,
      asset_id: assetId,
      requirement_id: requirementId
    });

    let complianceRecord;
    if (existingRecords.length > 0) {
      complianceRecord = await base44.asServiceRole.entities.ComplianceRecord.update(
        existingRecords[0].id,
        {
          last_test_date: new Date().toISOString().split('T')[0],
          next_due_date: nextDueDate.toISOString().split('T')[0],
          certificate_url: certificateUrl,
          status: ocrResult.status || 'PASS',
          responsible_contractor: ocrResult.tester_name || 'Unknown',
          risk_level: 'LOW',
          uploaded_by: user.id
        }
      );
    } else {
      complianceRecord = await base44.asServiceRole.entities.ComplianceRecord.create({
        org_id: orgId,
        asset_id: assetId,
        site_id: siteId,
        requirement_id: requirementId,
        last_test_date: new Date().toISOString().split('T')[0],
        next_due_date: nextDueDate.toISOString().split('T')[0],
        certificate_url: certificateUrl,
        status: ocrResult.status || 'PASS',
        responsible_contractor: ocrResult.tester_name || 'Unknown',
        risk_level: 'LOW',
        uploaded_by: user.id
      });
    }

    console.log(`✅ Compliance record created/updated: ${complianceRecord.id}`);

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: orgId,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'ComplianceRecord',
      entity_id: complianceRecord.id,
      new_values: {
        certificate_uploaded: true,
        ocr_extracted: ocrResult
      }
    });

    return Response.json({
      success: true,
      certificate_url: certificateUrl,
      ocr_results: ocrResult,
      compliance_record: complianceRecord,
      next_due_date: nextDueDate.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Certificate upload error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});