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
    const metrics = await base44.asServiceRole.entities.DailyOrgMetrics.filter({ 
      org_id 
    });

    const latestMetric = metrics.length > 0 
      ? metrics.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;

    return new Response(JSON.stringify(latestMetric || { 
      error: "no data",
      org_id 
    }), {
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