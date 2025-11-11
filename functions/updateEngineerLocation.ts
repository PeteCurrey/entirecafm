import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only engineers can update their location
    if (user.role !== 'engineer') {
      return Response.json({ 
        error: 'Access denied: Only engineers can update location' 
      }, { status: 403 });
    }

    // Parse request
    const { lat, lng, accuracy, battery_level } = await req.json();

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return Response.json({ 
        error: 'Invalid coordinates: lat and lng must be numbers' 
      }, { status: 400 });
    }

    // Validate coordinates range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return Response.json({ 
        error: 'Invalid coordinates: lat must be [-90, 90], lng must be [-180, 180]' 
      }, { status: 400 });
    }

    // Create location record (enforced by org_id from token)
    const location = await base44.asServiceRole.entities.EngineerLocation.create({
      org_id: user.org_id,
      engineer_id: user.id,
      lat,
      lng,
      accuracy: accuracy || null,
      battery_level: battery_level || null,
      timestamp: new Date().toISOString()
    });

    // Update user's engineer_details with latest location
    const currentUser = await base44.asServiceRole.entities.User.filter({ id: user.id });
    if (currentUser && currentUser[0]) {
      const engineerDetails = currentUser[0].engineer_details || {};
      await base44.asServiceRole.entities.User.update(user.id, {
        engineer_details: {
          ...engineerDetails,
          location_lat: lat,
          location_lng: lng,
          last_location_update: new Date().toISOString()
        }
      });
    }

    // TODO: Emit WebSocket event to map.{org_id} channel
    // This would broadcast to all users viewing the map in real-time
    // Example: ws.publish(`map.${user.org_id}`, { type: 'engineer_move', engineer_id: user.id, lat, lng })

    return Response.json({
      success: true,
      location: {
        id: location.id,
        lat: location.lat,
        lng: location.lng,
        timestamp: location.timestamp
      },
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Location Update Error:', error);
    return Response.json({ 
      error: 'Failed to update location',
      details: error.message 
    }, { status: 500 });
  }
});