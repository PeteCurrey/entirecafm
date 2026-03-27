import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const org_id = url.searchParams.get("org") || Deno.env.get("DEFAULT_ORG_ID");

    if (!org_id) {
      return new Response(JSON.stringify({ 
        error: "org parameter required" 
      }), {
        status: 400,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*"
        }
      });
    }

    const base44 = createClientFromRequest(req);
    
    // Use service role for public access
    const [records, scores] = await Promise.all([
      base44.asServiceRole.entities.ComplianceRecord.filter({ org_id }),
      base44.asServiceRole.entities.SustainabilityScore.filter({ org_id })
    ]);

    const now = new Date();
    const overdue = records.filter(r => new Date(r.next_due_date) < now);
    const complianceRate = records.length > 0
      ? ((records.length - overdue.length) / records.length) * 100
      : 100;

    const orgScore = scores.find(s => !s.site_id);

    const overview = {
      org_id,
      compliance_rate: Math.round(complianceRate),
      total_records: records.length,
      overdue_count: overdue.length,
      esg_score: orgScore?.overall_esg_score || 0,
      esg_rating: orgScore?.rating || "N/A"
    };

    return new Response(JSON.stringify(overview), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "Content-Type"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      }
    });
  }
});