import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Redis client (Upstash REST API compatible)
const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

async function publishToRedis(channel, message) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('Redis not configured, skipping pub/sub');
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
    
    if (!response.ok) {
      console.error('Redis publish failed:', await response.text());
    } else {
      console.log(`✅ Published to ${channel}`);
    }
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lat, lng, accuracy, timestamp, battery_level } = await req.json();

    if (!lat || !lng) {
      return Response.json({ error: 'lat and lng are required' }, { status: 400 });
    }

    const org_id = user.org_id || 'default-org';
    
    // Rate limiting check (basic in-memory, production would use Redis)
    const locationTimestamp = timestamp || new Date().toISOString();
    
    // Check if engineer exists
    const engineers = await base44.entities.engineer.filter({ user_id: user.id });
    let engineer_id;
    
    if (engineers.length === 0) {
      // Create engineer record if doesn't exist
      const newEngineer = await base44.entities.engineer.create({
        org_id,
        user_id: user.id,
        skills_json: {},
      });
      engineer_id = newEngineer.id;
    } else {
      engineer_id = engineers[0].id;
    }

    // Upsert location (delete old + create new since we can't update by engineer_id directly)
    const existingLocations = await base44.entities.EngineerLocation.filter({ 
      engineer_id 
    });
    
    if (existingLocations.length > 0) {
      await base44.asServiceRole.entities.EngineerLocation.delete(existingLocations[0].id);
    }

    const location = await base44.entities.EngineerLocation.create({
      org_id,
      engineer_id,
      lat,
      lng,
      accuracy: accuracy || null,
      timestamp: locationTimestamp,
      battery_level: battery_level || null,
    });

    // Publish to Redis WebSocket topic
    const publishPayload = {
      type: 'engineer_location_update',
      engineer: {
        id: engineer_id,
        user_id: user.id,
        name: user.full_name,
        lat,
        lng,
        accuracy,
        timestamp: locationTimestamp,
        battery_level,
      },
      timestamp: new Date().toISOString(),
    };

    await publishToRedis(`map.org.${org_id}`, publishPayload);

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: 'UPDATE',
      entity_type: 'EngineerLocation',
      entity_id: location.id,
      new_values: { lat, lng, timestamp: locationTimestamp },
    });

    return Response.json({ 
      success: true, 
      location,
      published: !!REDIS_URL,
      redis_configured: !!REDIS_URL && !!REDIS_TOKEN
    });

  } catch (error) {
    console.error('updateEngineerLocation error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});