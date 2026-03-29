import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all organizations with active SEO keywords
    const keywords = await base44.asServiceRole.entities.SEOKeyword.filter({ 
      status: 'active' 
    });
    
    const orgIds = [...new Set(keywords.map(k => k.org_id))];
    const results = { success: 0, errors: [] };

    for (const orgId of orgIds) {
      const orgKeywords = keywords.filter(k => k.org_id === orgId);
      
      for (const keyword of orgKeywords) {
        try {
          // Track keyword with competitors
          await base44.asServiceRole.functions.invoke('seoTracker', {
            org_id: orgId,
            keyword: keyword.keyword,
            url: keyword.url,
            check_competitors: true,
            run_audit: false
          });
          
          results.success++;
        } catch (error) {
          console.error(`Error tracking keyword ${keyword.id}:`, error);
          results.errors.push({
            keyword_id: keyword.id,
            error: error.message
          });
        }
      }
    }

    return Response.json({
      success: true,
      tracked: results.success,
      errors: results.errors.length,
      message: `Tracked ${results.success} keywords across ${orgIds.length} organizations`
    });

  } catch (error) {
    console.error('SEO scheduler error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});