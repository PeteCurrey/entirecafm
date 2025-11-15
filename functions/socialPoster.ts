import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org_id, brief_id, platforms = ['linkedin'], schedule_time } = await req.json();

    console.log(`📱 Creating social posts for platforms:`, platforms);

    // Fetch executive brief
    let briefData;
    if (brief_id) {
      const briefs = await base44.entities.ExecutiveBrief.filter({ id: brief_id });
      if (briefs.length === 0) {
        return Response.json({ error: 'Brief not found' }, { status: 404 });
      }
      briefData = briefs[0];
    } else {
      // Get latest brief
      const allBriefs = await base44.entities.ExecutiveBrief.filter({ org_id });
      if (allBriefs.length === 0) {
        return Response.json({ error: 'No briefs available' }, { status: 404 });
      }
      briefData = allBriefs.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      )[0];
    }

    console.log(`📊 Using brief from: ${briefData.created_date}`);

    // Generate platform-specific posts using AI
    const socialContent = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a social media marketing expert. Transform this executive business brief into engaging social media posts.

BRIEF SUMMARY:
${briefData.summary_text || 'Operations update with key metrics and insights'}

KEY METRICS:
- Active Jobs: ${briefData.metrics_json?.active_jobs || 'N/A'}
- Revenue: ${briefData.metrics_json?.revenue || 'N/A'}
- Client Health: ${briefData.metrics_json?.client_health || 'N/A'}

Create posts for these platforms: ${platforms.join(', ')}

REQUIREMENTS:
- LinkedIn: Professional, thought leadership angle, 1500-2000 chars, include hashtags
- Twitter/X: Concise, engaging, max 280 chars, 2-3 hashtags
- Use emojis strategically but professionally
- Include call-to-action
- Focus on achievements and value
- Maintain brand voice: innovative, reliable, data-driven

Return JSON with platform-specific content.`,
      response_json_schema: {
        type: "object",
        properties: {
          linkedin: {
            type: "object",
            properties: {
              text: { type: "string" },
              hashtags: { type: "array", items: { type: "string" } }
            }
          },
          twitter: {
            type: "object",
            properties: {
              text: { type: "string" },
              hashtags: { type: "array", items: { type: "string" } }
            }
          },
          best_time: { type: "string" },
          engagement_prediction: { type: "string" }
        }
      }
    });

    console.log(`✅ Generated posts for ${platforms.length} platform(s)`);

    // Determine optimal posting time using AI if not provided
    let postTime = schedule_time;
    if (!postTime) {
      const now = new Date();
      const optimalHour = socialContent.best_time?.includes('morning') ? 9 : 
                          socialContent.best_time?.includes('lunch') ? 12 : 
                          socialContent.best_time?.includes('evening') ? 17 : 10;
      
      postTime = new Date(now);
      postTime.setHours(optimalHour, 0, 0, 0);
      if (postTime < now) {
        postTime.setDate(postTime.getDate() + 1);
      }
    }

    // Create communication events for each platform
    const events = [];
    for (const platform of platforms) {
      const platformContent = socialContent[platform.toLowerCase()];
      
      if (platformContent) {
        const event = await base44.entities.CommunicationEvent.create({
          org_id,
          event_type: 'social_post',
          channel: platform.toLowerCase(),
          recipient: 'public',
          message_text: platformContent.text,
          metadata: {
            hashtags: platformContent.hashtags,
            brief_id: briefData.id,
            scheduled_time: postTime,
            engagement_prediction: socialContent.engagement_prediction
          },
          status: 'scheduled',
          sent_date: null
        });
        
        events.push(event);
        console.log(`📅 Scheduled ${platform} post for ${postTime}`);
      }
    }

    // Log audit trail
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'SocialPost',
      entity_id: `social-${Date.now()}`,
      new_values: {
        platforms,
        brief_id: briefData.id,
        scheduled_time: postTime,
        event_count: events.length
      }
    });

    return Response.json({
      success: true,
      posts: events,
      preview: {
        linkedin: socialContent.linkedin,
        twitter: socialContent.twitter,
        scheduled_time: postTime,
        engagement_prediction: socialContent.engagement_prediction,
        best_time_recommendation: socialContent.best_time
      }
    });

  } catch (error) {
    console.error('❌ socialPoster error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});