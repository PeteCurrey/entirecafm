import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

async function publishToRedis(channel, message) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('Redis not configured');
    return;
  }
  
  try {
    const response = await fetch(`${REDIS_URL}/publish/${channel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });
    
    if (response.ok) {
      console.log(`✅ Published to ${channel}`);
    }
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all organizations
    const orgs = await base44.asServiceRole.entities.Organisation.list();
    
    console.log(`🔄 Refreshing director dashboards for ${orgs.length} organizations`);
    
    for (const org of orgs) {
      try {
        // Call the director dashboard function for each org
        const result = await base44.asServiceRole.functions.invoke('aiDirectorDashboard', {
          org_id: org.id
        });
        
        if (result.data?.success) {
          // Publish to Redis for real-time updates
          await publishToRedis(`director.org.${org.id}`, {
            type: 'director_dashboard_update',
            data: result.data,
            timestamp: new Date().toISOString()
          });
          
          console.log(`✅ Refreshed dashboard for org: ${org.id}`);
        }
      } catch (orgError) {
        console.error(`Failed to refresh org ${org.id}:`, orgError.message);
      }
    }
    
    return Response.json({
      success: true,
      orgs_processed: orgs.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Schedule error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});