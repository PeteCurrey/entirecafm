import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch engineers with recent locations (org_id filtered automatically)
    const users = await base44.entities.User.list();
    const engineers = users.filter(u => 
      u.role === 'engineer' && 
      u.engineer_details?.location_lat && 
      u.engineer_details?.location_lng
    );

    // Fetch active jobs with locations
    const jobs = await base44.entities.Job.list();
    const activeJobs = jobs.filter(j => 
      !['completed', 'cancelled'].includes(j.status) &&
      j.site_id
    );

    // Fetch sites for job locations
    const sites = await base44.entities.Site.list();
    const siteMap = Object.fromEntries(sites.map(s => [s.id, s]));

    // Fetch clients
    const clients = await base44.entities.Client.list();
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

    // Build engineer markers
    const engineerMarkers = engineers.map(engineer => {
      const details = engineer.engineer_details || {};
      return {
        id: engineer.id,
        type: 'engineer',
        name: engineer.full_name,
        initials: engineer.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'EN',
        lat: details.location_lat,
        lng: details.location_lng,
        status: details.is_available ? 'available' : 'busy',
        last_update: details.last_location_update
      };
    });

    // Build job markers with SLA risk calculation
    const jobMarkers = activeJobs
      .filter(job => {
        const site = siteMap[job.site_id];
        return site?.lat && site?.lng;
      })
      .map(job => {
        const site = siteMap[job.site_id];
        const client = clientMap[job.client_id];
        
        // Calculate SLA risk
        let atRisk = false;
        if (job.sla_due_date) {
          const dueDate = new Date(job.sla_due_date);
          const now = new Date();
          const hoursRemaining = (dueDate - now) / (1000 * 60 * 60);
          atRisk = hoursRemaining < 4 && hoursRemaining > 0; // Less than 4 hours
        }

        return {
          id: job.id,
          type: 'job',
          title: job.title,
          status: job.status,
          priority: job.priority,
          client: client?.name || 'Unknown',
          site: site?.name || 'Unknown',
          lat: site.lat,
          lng: site.lng,
          atRisk,
          assignedEngineer: job.assigned_engineer_id
        };
      });

    // Calculate center point (average of all markers)
    const allLats = [...engineerMarkers.map(e => e.lat), ...jobMarkers.map(j => j.lat)];
    const allLngs = [...engineerMarkers.map(e => e.lng), ...jobMarkers.map(j => j.lng)];
    
    const center = allLats.length > 0 ? {
      lat: allLats.reduce((a, b) => a + b, 0) / allLats.length,
      lng: allLngs.reduce((a, b) => a + b, 0) / allLngs.length
    } : { lat: 51.5074, lng: -0.1278 }; // Default to London

    return Response.json({
      success: true,
      center,
      engineers: engineerMarkers,
      jobs: jobMarkers,
      stats: {
        total_engineers: engineerMarkers.length,
        available_engineers: engineerMarkers.filter(e => e.status === 'available').length,
        active_jobs: jobMarkers.length,
        at_risk_jobs: jobMarkers.filter(j => j.atRisk).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Map State Error:', error);
    return Response.json({ 
      error: 'Failed to fetch map state',
      details: error.message 
    }, { status: 500 });
  }
});