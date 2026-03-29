import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

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

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { org_id, job_id, auto_assign = false } = body;
    const orgId = org_id || user.org_id || 'default-org';

    console.log(`🤖 AI Engineer Scheduler for org: ${orgId}`);

    // Fetch active jobs (unassigned or specified job)
    const jobsFilter = job_id 
      ? { id: job_id }
      : { org_id: orgId, status: 'new' };
    
    const jobs = await base44.asServiceRole.entities.Job.filter(jobsFilter);
    
    if (jobs.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No jobs to schedule' 
      });
    }

    // Fetch engineers and their current locations
    const engineers = await base44.asServiceRole.entities.User.filter({ 
      role: 'user' // Assuming engineers have 'user' role
    });

    const engineerLocations = await base44.asServiceRole.entities.EngineerLocation.list('-timestamp', 100);

    // Fetch sites for job locations
    const sites = await base44.asServiceRole.entities.Site.filter({ org_id: orgId });

    const assignments = [];

    for (const job of jobs) {
      const site = sites.find(s => s.id === job.site_id);
      if (!site || !site.lat || !site.lng) {
        console.warn(`⚠️ Job ${job.id} has no valid site location`);
        continue;
      }

      // Calculate scores for each engineer
      const engineerScores = engineers.map(engineer => {
        const recentLocation = engineerLocations.find(loc => loc.engineer_id === engineer.id);
        
        if (!recentLocation) {
          return { engineer, score: 0, distance: 999, reason: 'No location data' };
        }

        // Calculate distance
        const distance = haversineDistance(
          recentLocation.lat,
          recentLocation.lng,
          site.lat,
          site.lng
        );

        // Check current workload (jobs scheduled today)
        const now = new Date();
        const todayJobs = jobs.filter(j => 
          j.assigned_engineer_id === engineer.id &&
          j.scheduled_date &&
          new Date(j.scheduled_date).toDateString() === now.toDateString()
        ).length;

        // Urgency weight
        const urgencyWeight = {
          'critical': 100,
          'high': 75,
          'medium': 50,
          'low': 25
        }[job.priority] || 50;

        // Score calculation: lower is better
        // Distance penalty + workload penalty - urgency boost
        const distancePenalty = distance * 10;
        const workloadPenalty = todayJobs * 50;
        const score = distancePenalty + workloadPenalty - urgencyWeight;

        return {
          engineer,
          score,
          distance: Math.round(distance * 10) / 10,
          workload: todayJobs,
          reason: 'Available'
        };
      }).sort((a, b) => a.score - b.score);

      const bestMatch = engineerScores[0];

      if (!bestMatch) {
        console.warn(`⚠️ No suitable engineer found for job ${job.id}`);
        continue;
      }

      assignments.push({
        job_id: job.id,
        job_title: job.title,
        engineer_id: bestMatch.engineer.id,
        engineer_name: bestMatch.engineer.full_name,
        distance_km: bestMatch.distance,
        current_workload: bestMatch.workload,
        score: Math.round(bestMatch.score),
        auto_assigned: auto_assign
      });

      // Auto-assign if requested
      if (auto_assign) {
        await base44.asServiceRole.entities.Job.update(job.id, {
          assigned_engineer_id: bestMatch.engineer.id,
          status: 'assigned'
        });

        console.log(`✅ Auto-assigned ${bestMatch.engineer.full_name} to job ${job.job_number}`);

        // Publish to Redis for real-time updates
        await publishToRedis(`jobs.org.${orgId}`, {
          type: 'job_status_update',
          job: {
            id: job.id,
            job_number: job.job_number,
            status: 'assigned',
            assigned_engineer_id: bestMatch.engineer.id,
            assigned_engineer_name: bestMatch.engineer.full_name
          },
          timestamp: new Date().toISOString()
        });

        await publishToRedis(`map.org.${orgId}`, {
          type: 'job_assigned',
          job_id: job.id,
          engineer_id: bestMatch.engineer.id,
          distance: bestMatch.distance,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id: orgId,
      user_id: user.id,
      action: auto_assign ? 'UPDATE' : 'READ',
      entity_type: 'Job',
      entity_id: `scheduler-${Date.now()}`,
      new_values: {
        assignments_calculated: assignments.length,
        auto_assigned: auto_assign
      }
    });

    return Response.json({
      success: true,
      assignments,
      total_jobs: jobs.length,
      auto_assigned: auto_assign
    });

  } catch (error) {
    console.error('AI Engineer Scheduler error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});