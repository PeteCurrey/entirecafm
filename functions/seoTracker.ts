import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org_id, keyword, url } = await req.json();

    if (!keyword) {
      return Response.json({ error: 'Keyword required' }, { status: 400 });
    }

    console.log(`🔍 Tracking keyword: "${keyword}" for org: ${org_id}`);

    // Simulate SERP API call (in production, integrate with SerpAPI, DataForSEO, etc.)
    // For demo purposes, we'll use AI to generate realistic ranking data
    const serpData = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a SERP rank simulator. Given the keyword "${keyword}" for a CAFM/facilities management company, generate realistic SEO metrics.
      
      Consider:
      - Most CAFM companies rank between positions 15-50 for competitive keywords
      - Local/niche keywords might rank 5-15
      - Brand keywords rank 1-5
      - New content starts at 50-100
      
      Return JSON with:
      - rank (1-100): Current SERP position
      - search_volume (100-10000): Monthly searches
      - competition ("low"|"medium"|"high"): Keyword difficulty
      - change_7d (-10 to +10): Rank change (negative = improved)`,
      response_json_schema: {
        type: "object",
        properties: {
          rank: { type: "number" },
          search_volume: { type: "number" },
          competition: { type: "string" },
          change_7d: { type: "number" }
        }
      }
    });

    console.log(`📊 SERP Data:`, serpData);

    // Find existing keyword record
    const existingKeywords = await base44.entities.SEOKeyword.filter({
      org_id,
      keyword
    });

    let keywordRecord;
    const now = new Date().toISOString();

    if (existingKeywords.length > 0) {
      // Update existing
      const existing = existingKeywords[0];
      keywordRecord = await base44.entities.SEOKeyword.update(existing.id, {
        previous_rank: existing.rank,
        rank: serpData.rank,
        change_7d: serpData.change_7d,
        search_volume: serpData.search_volume,
        competition: serpData.competition,
        last_checked: now,
        url: url || existing.url
      });
      console.log(`✅ Updated keyword: ${keyword}`);
    } else {
      // Create new
      keywordRecord = await base44.entities.SEOKeyword.create({
        org_id,
        keyword,
        rank: serpData.rank,
        previous_rank: serpData.rank,
        change_7d: 0,
        search_volume: serpData.search_volume,
        competition: serpData.competition,
        last_checked: now,
        url: url || '',
        status: 'active'
      });
      console.log(`✅ Created new keyword: ${keyword}`);
    }

    return Response.json({
      success: true,
      keyword: keywordRecord,
      insights: {
        trend: serpData.change_7d < 0 ? 'improving' : serpData.change_7d > 0 ? 'declining' : 'stable',
        opportunity_score: serpData.rank > 20 && serpData.search_volume > 500 ? 'high' : 'medium'
      }
    });

  } catch (error) {
    console.error('❌ seoTracker error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});