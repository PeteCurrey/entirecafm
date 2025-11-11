import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Redis client (Upstash REST API compatible)
const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

async function publishToRedis(channel, message) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('Redis not configured, skipping pub/sub');
    return;
  }
  
  try {
    const response = await fetch(`${REDIS_URL}/publish/${channel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      console.error('Redis publish failed:', await response.text());
    } else {
      console.log(`✅ Published to ${channel}`);
    }
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

// Confidence thresholds
const THRESHOLD_AUTO_CREATE = 0.78;
const THRESHOLD_DRAFT = 0.55;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_id } = await req.json();

    if (!request_id) {
      return Response.json({ error: 'request_id is required' }, { status: 400 });
    }

    const org_id = user.org_id || 'default-org';

    // Fetch the request
    const request = await base44.entities.Request.get(request_id);
    
    if (!request) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    if (request.org_id !== org_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch related data for context
    const site = request.site_id ? await base44.entities.Site.get(request.site_id) : null;
    const client = request.client_id ? await base44.entities.Client.get(request.client_id) : null;

    // Build AI prompt with context
    const contextPrompt = `
You are an AI triage system for a field service management platform. 
Analyze the following maintenance request and provide a structured assessment.

REQUEST DETAILS:
- Title: ${request.title}
- Description: ${request.description || 'No description provided'}
- Priority: ${request.priority || 'Not specified'}
- Client: ${client?.name || 'Unknown'}
- Site: ${site?.name || 'Unknown'}
- Location: ${site?.address || 'Unknown'}
- Contact: ${request.contact_name || 'Unknown'} (${request.contact_phone || 'N/A'})

TASK:
1. Identify the specific issue/fault
2. Assess the confidence of your diagnosis (0.0 - 1.0)
3. Recommend a priority level (low, medium, high, critical)
4. Generate a step-by-step checklist for the engineer
5. List required parts with SKU codes (if identifiable)
6. Estimate job duration in minutes

Be specific and actionable. If information is insufficient, lower your confidence score.
`;

    // Call InvokeLLM with structured output
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: contextPrompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          issue: {
            type: "string",
            description: "Concise description of the identified issue"
          },
          confidence: {
            type: "number",
            description: "Confidence score between 0.0 and 1.0"
          },
          recommended_priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"]
          },
          checklist: {
            type: "array",
            items: { type: "string" },
            description: "Step-by-step checklist for the engineer"
          },
          required_parts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sku: { type: "string" },
                description: { type: "string" },
                qty: { type: "number" }
              }
            }
          },
          estimated_duration_minutes: {
            type: "number",
            description: "Estimated job duration in minutes"
          },
          reasoning: {
            type: "string",
            description: "Brief explanation of the diagnosis and confidence level"
          }
        },
        required: ["issue", "confidence", "recommended_priority", "checklist", "estimated_duration_minutes"]
      }
    });

    const confidence = aiResult.confidence || 0.5;

    // Determine status based on confidence thresholds
    let status = 'REVIEW_REQUIRED';
    let jobId = null;

    if (confidence >= THRESHOLD_AUTO_CREATE) {
      // Auto-create job
      const job = await base44.asServiceRole.entities.Job.create({
        org_id,
        title: request.title,
        description: `${request.description}\n\n🤖 AI Diagnosis: ${aiResult.issue}`,
        job_type: 'reactive',
        priority: aiResult.recommended_priority,
        status: 'new',
        client_id: request.client_id,
        site_id: request.site_id,
        building_id: request.building_id,
        request_id: request.id,
        scheduled_date: request.preferred_date,
        notes: [
          {
            text: `🤖 AI Triage (${(confidence * 100).toFixed(0)}% confidence)\n\nChecklist:\n${aiResult.checklist.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n\nParts: ${aiResult.required_parts?.map(p => `${p.description} (${p.sku}) x${p.qty}`).join(', ') || 'None identified'}`,
            created_by: 'AI Triage',
            created_at: new Date().toISOString()
          }
        ]
      });

      jobId = job.id;
      status = 'AUTO_CREATED';

      // Update request
      await base44.asServiceRole.entities.Request.update(request_id, {
        status: 'converted',
        converted_job_id: job.id,
        converted_date: new Date().toISOString()
      });

      // Publish to Redis
      await publishToRedis(`jobs.org.${org_id}`, {
        type: 'job_created',
        job: {
          id: job.id,
          title: job.title,
          status: job.status,
          priority: job.priority,
          created_by: 'AI Triage'
        },
        timestamp: new Date().toISOString()
      });

    } else if (confidence >= THRESHOLD_DRAFT) {
      // Create job draft (awaiting confirmation)
      const job = await base44.asServiceRole.entities.Job.create({
        org_id,
        title: `[DRAFT] ${request.title}`,
        description: `${request.description}\n\n🤖 AI Diagnosis: ${aiResult.issue}\n⚠️ Confidence: ${(confidence * 100).toFixed(0)}% - Requires confirmation`,
        job_type: 'reactive',
        priority: aiResult.recommended_priority,
        status: 'new',
        client_id: request.client_id,
        site_id: request.site_id,
        building_id: request.building_id,
        request_id: request.id,
        requires_approval: true,
        notes: [
          {
            text: `🤖 AI Triage (${(confidence * 100).toFixed(0)}% confidence - LOW)\n\nReasoning: ${aiResult.reasoning || 'Insufficient data'}\n\nSuggested Checklist:\n${aiResult.checklist.map((item, i) => `${i + 1}. ${item}`).join('\n')}`,
            created_by: 'AI Triage',
            created_at: new Date().toISOString()
          }
        ]
      });

      jobId = job.id;
      status = 'AWAITING_CONFIRMATION';

      // Publish to Redis
      await publishToRedis(`jobs.org.${org_id}`, {
        type: 'job_draft_created',
        job: {
          id: job.id,
          title: job.title,
          status: job.status,
          priority: job.priority,
          requires_confirmation: true
        },
        timestamp: new Date().toISOString()
      });
    }

    // Create AI triage task record
    const triageTask = await base44.asServiceRole.entities.AITriageTask.create({
      org_id,
      request_id: request.id,
      ai_output: aiResult,
      confidence,
      status,
      job_id: jobId
    });

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'AITriageTask',
      entity_id: triageTask.id,
      new_values: {
        confidence,
        status,
        issue: aiResult.issue
      }
    });

    return Response.json({
      success: true,
      triage_task: triageTask,
      status,
      confidence,
      job_id: jobId,
      ai_output: aiResult,
      message: 
        status === 'AUTO_CREATED' ? '✅ Job created automatically' :
        status === 'AWAITING_CONFIRMATION' ? '⚠️ Low confidence. Human confirmation required.' :
        '🛑 Needs manual triage.'
    });

  } catch (error) {
    console.error('aiHelpdeskTriage error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});