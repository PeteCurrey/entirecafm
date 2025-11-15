import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org_id, topic, target_keywords = [] } = await req.json();

    if (!topic) {
      return Response.json({ error: 'Topic required' }, { status: 400 });
    }

    console.log(`✍️ Generating content for topic: "${topic}"`);

    // Generate SEO-optimized blog post using AI
    const contentData = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert content writer for the facilities management and CAFM industry. 

Create a comprehensive, SEO-optimized blog post about: "${topic}"

Requirements:
- 1200-1500 words
- Include H2 and H3 headings for structure
- Natural keyword integration: ${target_keywords.join(', ') || 'facilities management, CAFM, preventive maintenance'}
- Engaging introduction with clear value proposition
- Data-driven insights and industry statistics
- Practical tips and actionable advice
- Strong conclusion with call-to-action
- Professional yet conversational tone

Format as HTML with proper semantic tags (<h2>, <h3>, <p>, <ul>, <strong>, <em>).

Also provide:
- SEO title (60 chars max)
- Meta description (155 chars max)
- 5 relevant tags
- Quality score (0-100) based on SEO best practices`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          meta_description: { type: "string" },
          tags: { 
            type: "array",
            items: { type: "string" }
          },
          html_content: { type: "string" },
          word_count: { type: "number" },
          ai_score: { type: "number" }
        }
      }
    });

    console.log(`📝 Content generated: ${contentData.word_count} words, Score: ${contentData.ai_score}/100`);

    // Create ContentPost record
    const contentPost = await base44.entities.ContentPost.create({
      org_id,
      title: contentData.title,
      topic,
      meta_description: contentData.meta_description,
      tags: contentData.tags,
      draft_html: contentData.html_content,
      word_count: contentData.word_count,
      target_keywords: target_keywords.length > 0 ? target_keywords : ['facilities management', 'CAFM', 'maintenance'],
      status: 'draft',
      ai_score: contentData.ai_score
    });

    console.log(`✅ Content post created: ${contentPost.id}`);

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'ContentPost',
      entity_id: contentPost.id,
      new_values: {
        title: contentData.title,
        topic,
        word_count: contentData.word_count,
        ai_score: contentData.ai_score
      }
    });

    return Response.json({
      success: true,
      content: contentPost,
      preview: {
        title: contentData.title,
        excerpt: contentData.meta_description,
        word_count: contentData.word_count,
        tags: contentData.tags,
        quality_score: contentData.ai_score
      }
    });

  } catch (error) {
    console.error('❌ contentGenerator error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});