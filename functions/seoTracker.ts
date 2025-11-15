import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { org_id, keyword, url, check_competitors = false, run_audit = false } = body;

    if (!keyword || !url) {
      return Response.json({ error: 'keyword and url required' }, { status: 400 });
    }

    // Simulate SERP data using LLM (in production, use real SERP API)
    const serpResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a SERP API simulator. For the keyword "${keyword}" and URL "${url}", generate realistic search ranking data.
      
Return data in the following format:
- Current rank (1-100, or null if not ranking)
- Previous rank (for comparison)
- Monthly search volume (realistic number based on keyword type)
- Competition level (low, medium, high)

Be realistic: commercial keywords have higher volume, long-tail have lower volume.`,
      response_json_schema: {
        type: "object",
        properties: {
          current_rank: { type: ["number", "null"] },
          previous_rank: { type: ["number", "null"] },
          search_volume: { type: "number" },
          competition: { type: "string", enum: ["low", "medium", "high"] }
        }
      }
    });

    const rankData = serpResponse;

    // Find or create keyword record
    let keywordRecord = (await base44.asServiceRole.entities.SEOKeyword.filter({
      org_id,
      keyword,
      url
    }))[0];

    const now = new Date().toISOString();

    if (!keywordRecord) {
      keywordRecord = await base44.asServiceRole.entities.SEOKeyword.create({
        org_id,
        keyword,
        url,
        rank: rankData.current_rank,
        previous_rank: rankData.previous_rank,
        search_volume: rankData.search_volume,
        competition: rankData.competition,
        last_checked: now,
        status: 'active',
        change_7d: rankData.previous_rank && rankData.current_rank 
          ? rankData.previous_rank - rankData.current_rank 
          : 0
      });
    } else {
      // Update existing record
      await base44.asServiceRole.entities.SEOKeyword.update(keywordRecord.id, {
        previous_rank: keywordRecord.rank,
        rank: rankData.current_rank,
        search_volume: rankData.search_volume,
        competition: rankData.competition,
        last_checked: now,
        change_7d: keywordRecord.rank && rankData.current_rank
          ? keywordRecord.rank - rankData.current_rank
          : 0
      });
    }

    // Store historical data
    await base44.asServiceRole.entities.SEOKeywordHistory.create({
      org_id,
      keyword_id: keywordRecord.id,
      keyword,
      url,
      rank: rankData.current_rank,
      search_volume: rankData.search_volume,
      checked_at: now,
      is_competitor: false
    });

    // Track competitors if requested
    let competitorData = [];
    if (check_competitors) {
      const competitors = await base44.asServiceRole.entities.SEOCompetitor.filter({
        org_id,
        is_active: true
      });

      for (const competitor of competitors) {
        const compSerpResponse = await base44.integrations.Core.InvokeLLM({
          prompt: `For keyword "${keyword}", estimate the SERP rank for competitor domain "${competitor.domain}". Return a realistic rank (1-100) or null if not ranking.`,
          response_json_schema: {
            type: "object",
            properties: {
              rank: { type: ["number", "null"] }
            }
          }
        });

        // Store competitor history
        await base44.asServiceRole.entities.SEOKeywordHistory.create({
          org_id,
          keyword_id: keywordRecord.id,
          keyword,
          url: competitor.domain,
          rank: compSerpResponse.rank,
          search_volume: rankData.search_volume,
          checked_at: now,
          is_competitor: true
        });

        competitorData.push({
          competitor: competitor.name || competitor.domain,
          rank: compSerpResponse.rank
        });
      }
    }

    // Run on-page SEO audit if requested
    let auditResult = null;
    if (run_audit) {
      const auditResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Perform a simulated on-page SEO audit for URL "${url}" targeting keyword "${keyword}".

Generate realistic audit data including:
- Page title and length (50-60 chars ideal)
- Meta description and length (150-160 chars ideal)
- H1 tags (should be 1)
- H2 tag count
- Word count (aim for 1000+ for blog posts)
- Keyword density for top 5 keywords
- SEO score (0-100)
- Issues found (e.g., "Title too short", "Missing meta description", "No H1 tag", "Low word count")
- Recommendations (e.g., "Add meta description", "Increase content length", "Optimize title for keyword")

Be realistic and helpful.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            title_length: { type: "number" },
            meta_description: { type: ["string", "null"] },
            meta_description_length: { type: ["number", "null"] },
            h1_tags: { type: "array", items: { type: "string" } },
            h2_count: { type: "number" },
            word_count: { type: "number" },
            keyword_density: { type: "object" },
            score: { type: "number" },
            issues: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      auditResult = await base44.asServiceRole.entities.SEOAudit.create({
        org_id,
        url,
        audit_date: now,
        ...auditResponse
      });
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'SEOKeyword',
      entity_id: keywordRecord.id,
      new_values: { keyword, url, rank: rankData.current_rank },
      timestamp: now
    });

    return Response.json({
      success: true,
      keyword: keywordRecord,
      rank_data: rankData,
      competitors: competitorData,
      audit: auditResult,
      insight: rankData.current_rank 
        ? `"${keyword}" ranks at position ${rankData.current_rank}`
        : `"${keyword}" is not currently ranking in top 100`
    });

  } catch (error) {
    console.error('SEO Tracker error:', error);
    return Response.json({ 
      error: error.message || 'Failed to track keyword'
    }, { status: 500 });
  }
});