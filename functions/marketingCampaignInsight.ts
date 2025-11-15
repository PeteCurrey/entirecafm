import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { org_id } = body;

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Fetch lead events
    const leadEvents = await base44.asServiceRole.entities.LeadEvent.filter({ 
      org_id 
    });

    // Fetch lead sources
    const leadSources = await base44.asServiceRole.entities.LeadSource.filter({ 
      org_id 
    });

    // Fetch SEO keywords
    const keywords = await base44.asServiceRole.entities.SEOKeyword.filter({ 
      org_id 
    });

    // Fetch content posts
    const contentPosts = await base44.asServiceRole.entities.ContentPost.filter({ 
      org_id 
    });

    // Calculate organic conversions (from SEO/Content)
    const organicSources = leadSources.filter(s => 
      s.channel === 'organic' || s.channel === 'seo' || s.channel === 'content'
    );

    let organicConversions = 0;
    let organicRevenue = 0;
    let organicSpend = 0;

    for (const source of organicSources) {
      // Count enquiries
      const enquiries = leadEvents.filter(e => 
        e.source_id === source.id && 
        e.event_type === 'ENQUIRY' &&
        new Date(e.event_date) >= thirtyDaysAgo
      );

      // Count conversions (invoice paid)
      const conversions = leadEvents.filter(e => 
        e.source_id === source.id && 
        e.event_type === 'INVOICE_PAID' &&
        new Date(e.event_date) >= thirtyDaysAgo
      );

      organicConversions += conversions.length;
      organicRevenue += conversions.reduce((sum, e) => sum + (e.event_value || 0), 0);
      organicSpend += source.cost_per_month || 0;
    }

    const seoROI = organicSpend > 0 ? organicRevenue / organicSpend : 0;

    // Match keywords to revenue
    const keywordAttribution = [];
    for (const keyword of keywords) {
      // Find clients that came from pages targeting this keyword
      const keywordRevenue = leadEvents
        .filter(e => 
          e.event_type === 'INVOICE_PAID' &&
          e.metadata?.landing_page?.includes(keyword.url)
        )
        .reduce((sum, e) => sum + (e.event_value || 0), 0);

      if (keywordRevenue > 0) {
        keywordAttribution.push({
          keyword: keyword.keyword,
          rank: keyword.rank,
          revenue: keywordRevenue
        });
      }
    }

    // Match content posts to revenue
    const contentAttribution = [];
    for (const post of contentPosts) {
      if (post.status !== 'published' || !post.published_url) continue;

      const postRevenue = leadEvents
        .filter(e => 
          e.event_type === 'INVOICE_PAID' &&
          e.metadata?.landing_page === post.published_url
        )
        .reduce((sum, e) => sum + (e.event_value || 0), 0);

      if (postRevenue > 0) {
        contentAttribution.push({
          title: post.title,
          url: post.published_url,
          revenue: postRevenue
        });
      }
    }

    // Update daily metrics
    const today = now.toISOString().split('T')[0];
    const existingMetric = (await base44.asServiceRole.entities.MarketingMetricsDaily.filter({
      org_id,
      date: today
    }))[0];

    if (existingMetric) {
      await base44.asServiceRole.entities.MarketingMetricsDaily.update(existingMetric.id, {
        organic_conversions: organicConversions,
        seo_roi: seoROI,
        organic_revenue: organicRevenue
      });
    } else {
      await base44.asServiceRole.entities.MarketingMetricsDaily.create({
        org_id,
        date: today,
        organic_conversions: organicConversions,
        seo_roi: seoROI,
        organic_revenue: organicRevenue,
        spend: organicSpend,
        revenue_realised: organicRevenue,
        conversion_rate: 0 // Will be calculated by main marketing compute
      });
    }

    // Create insights as Next Best Actions
    if (keywordAttribution.length > 0) {
      const topKeyword = keywordAttribution.sort((a, b) => b.revenue - a.revenue)[0];
      
      await base44.asServiceRole.entities.NextBestAction.create({
        org_id,
        action_type: 'OPTIMIZE_CONTENT',
        description: `Top performing keyword "${topKeyword.keyword}" generated £${topKeyword.revenue.toFixed(0)}. Create more content targeting similar keywords.`,
        confidence: 0.85,
        priority: 'medium',
        status: 'pending',
        metadata: {
          keyword: topKeyword.keyword,
          revenue: topKeyword.revenue,
          rank: topKeyword.rank
        }
      });
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'MarketingCampaignInsight',
      entity_id: org_id,
      new_values: {
        organic_conversions: organicConversions,
        organic_revenue: organicRevenue,
        seo_roi: seoROI
      },
      timestamp: now.toISOString()
    });

    return Response.json({
      success: true,
      insights: {
        organic_conversions: organicConversions,
        organic_revenue: organicRevenue,
        organic_spend: organicSpend,
        seo_roi: seoROI,
        keyword_attribution: keywordAttribution.slice(0, 10),
        content_attribution: contentAttribution.slice(0, 10)
      },
      message: `Analyzed ${leadEvents.length} lead events, attributed £${organicRevenue.toFixed(0)} to organic channels`
    });

  } catch (error) {
    console.error('Marketing campaign insight error:', error);
    return Response.json({ 
      error: error.message || 'Failed to compute marketing insights'
    }, { status: 500 });
  }
});