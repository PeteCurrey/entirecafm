import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

async function publishToRedis(channel, message) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/publish/${channel}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` },
      body: JSON.stringify(message)
    });
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { org_id, auto_create_jobs = false } = body;

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    const [records, requirements, assets, sites] = await Promise.all([
      base44.asServiceRole.entities.ComplianceRecord.filter({ org_id }),
      base44.asServiceRole.entities.ComplianceRequirement.filter({ org_id, active: true }),
      base44.asServiceRole.entities.Asset.filter({ org_id }),
      base44.asServiceRole.entities.Site.filter({ org_id })
    ]);

    const overdue = [];
    const expiringSoon = [];
    let totalRequired = 0;
    let compliant = 0;
    let jobsCreated = 0;

    for (const record of records) {
      totalRequired++;
      const dueDate = new Date(record.next_due_date);
      const asset = assets.find(a => a.id === record.asset_id);
      const site = sites.find(s => s.id === record.site_id);
      const requirement = requirements.find(r => r.id === record.requirement_id);

      if (dueDate < now) {
        // Overdue
        overdue.push({
          record_id: record.id,
          asset_name: asset?.name,
          site_name: site?.name,
          requirement: requirement?.requirement_name,
          days_overdue: Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
        });

        // Update risk level
        await base44.asServiceRole.entities.ComplianceRecord.update(record.id, {
          risk_level: 'HIGH'
        });

        // Auto-create job if enabled
        if (auto_create_jobs && asset) {
          const job = await base44.asServiceRole.entities.Job.create({
            org_id,
            job_number: `COMP-${Date.now()}-${record.id.slice(0, 6)}`,
            title: `Compliance: ${requirement?.requirement_name || 'Test'}`,
            description: `Overdue compliance test for ${asset.name}`,
            job_type: 'ppm',
            priority: 'high',
            status: 'new',
            site_id: record.site_id,
            asset_id: record.asset_id,
            notes: [{
              text: `Auto-generated from compliance monitoring - ${Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))} days overdue`,
              created_by: 'ComplianceMonitor',
              created_at: now.toISOString()
            }]
          });
          jobsCreated++;
        }
      } else if (dueDate < thirtyDaysFromNow) {
        // Expiring soon
        expiringSoon.push({
          record_id: record.id,
          asset_name: asset?.name,
          site_name: site?.name,
          requirement: requirement?.requirement_name,
          days_until_due: Math.floor((dueDate - now) / (1000 * 60 * 60 * 24))
        });

        await base44.asServiceRole.entities.ComplianceRecord.update(record.id, {
          risk_level: 'MED'
        });
      } else {
        compliant++;
        await base44.asServiceRole.entities.ComplianceRecord.update(record.id, {
          risk_level: 'LOW'
        });
      }
    }

    const complianceRate = totalRequired > 0 ? (compliant / totalRequired) * 100 : 100;

    // Publish to Redis
    await publishToRedis(`compliance.org.${org_id}`, {
      type: 'compliance_update',
      compliance_rate: complianceRate,
      overdue_count: overdue.length,
      expiring_soon: expiringSoon.length,
      jobs_created: jobsCreated,
      timestamp: now.toISOString()
    });

    // Create alert if many overdue
    if (overdue.length > 5) {
      await base44.asServiceRole.entities.AlertEvent.create({
        org_id,
        alert_type: 'COMPLIANCE_OVERDUE',
        severity: 'high',
        message: `${overdue.length} compliance tests are overdue`,
        metadata: { overdue_count: overdue.length },
        timestamp: now.toISOString()
      });
    }

    return Response.json({
      success: true,
      compliance_rate: Math.round(complianceRate * 10) / 10,
      overdue: overdue.length,
      expiring_soon: expiringSoon.length,
      compliant,
      total_required: totalRequired,
      jobs_created: jobsCreated,
      overdue_details: overdue.slice(0, 10),
      expiring_details: expiringSoon.slice(0, 10)
    });

  } catch (error) {
    console.error('Compliance monitor error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});