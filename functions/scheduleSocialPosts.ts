import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const now = new Date();
    
    // Find scheduled posts that are due
    const scheduledPosts = await base44.asServiceRole.entities.CommunicationEvent.filter({ 
      event_type: 'social_post',
      status: 'scheduled'
    });
    
    const duePosts = scheduledPosts.filter(post => {
      if (!post.metadata?.scheduled_time) return false;
      const scheduledTime = new Date(post.metadata.scheduled_time);
      return scheduledTime <= now;
    });

    const results = { posted: 0, errors: [] };

    for (const post of duePosts) {
      try {
        // In production, this would post to actual social media APIs
        // For now, we'll mark it as 'sent' (simulating successful post)
        
        await base44.asServiceRole.entities.CommunicationEvent.update(post.id, {
          status: 'sent',
          metadata: {
            ...post.metadata,
            posted_at: now.toISOString(),
            simulated: true
          }
        });
        
        // Create audit log
        await base44.asServiceRole.entities.AuditLog.create({
          org_id: post.org_id,
          user_id: 'system',
          action: 'UPDATE',
          entity_type: 'CommunicationEvent',
          entity_id: post.id,
          old_values: { status: 'scheduled' },
          new_values: { status: 'sent' },
          timestamp: now.toISOString()
        });

        results.posted++;

      } catch (error) {
        console.error(`Error posting ${post.id}:`, error);
        results.errors.push({
          post_id: post.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      posted: results.posted,
      errors: results.errors.length,
      message: `Posted ${results.posted} social media posts`
    });

  } catch (error) {
    console.error('Social post scheduler error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});