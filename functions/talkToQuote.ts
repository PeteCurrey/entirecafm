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
const THRESHOLD_NORMAL_DRAFT = 0.80;
const THRESHOLD_CONFIRMATION = 0.60;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { voice_note_id, audio_url, job_id } = await req.json();

    if (!audio_url || !job_id) {
      return Response.json({ 
        error: 'audio_url and job_id are required' 
      }, { status: 400 });
    }

    const org_id = user.org_id || 'default-org';

    // Fetch the job
    const job = await base44.entities.Job.get(job_id);
    
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.org_id !== org_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch related data for context
    const site = job.site_id ? await base44.entities.Site.get(job.site_id) : null;
    const client = job.client_id ? await base44.entities.Client.get(job.client_id) : null;

    // Create or update VoiceNote record
    let voiceNote;
    if (voice_note_id) {
      voiceNote = await base44.entities.VoiceNote.get(voice_note_id);
    } else {
      voiceNote = await base44.asServiceRole.entities.VoiceNote.create({
        org_id,
        job_id,
        audio_url,
        recorded_by: user.id,
        status: 'PROCESSING'
      });
    }

    // Step 1: Transcribe audio using InvokeLLM with file context
    console.log('📝 Transcribing audio...');
    const transcriptionResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Transcribe this audio recording from a field engineer. 
The engineer is describing work completed or parts needed for a maintenance job.
Provide only the transcription text, no additional commentary.`,
      file_urls: [audio_url]
    });

    const transcript = typeof transcriptionResult === 'string' 
      ? transcriptionResult 
      : transcriptionResult.transcription || transcriptionResult.text || '';

    console.log('✅ Transcript:', transcript);

    // Update voice note with transcript
    await base44.asServiceRole.entities.VoiceNote.update(voiceNote.id, {
      transcript
    });

    // Step 2: Parse transcript to extract structured data
    console.log('🧠 Parsing transcript...');
    const parsePrompt = `
You are an AI assistant for a field service management platform.
Analyze the following transcript from an engineer and extract structured data for quote generation.

TRANSCRIPT:
"${transcript}"

JOB CONTEXT:
- Job: ${job.title}
- Client: ${client?.name || 'Unknown'}
- Site: ${site?.name || 'Unknown'}
- Job Type: ${job.job_type}

TASK:
Extract the following information with high precision:
1. Parts/materials mentioned (name and quantity)
2. Labour time spent or estimated (in minutes)
3. Any additional notes or observations
4. Your confidence in the extraction (0.0 - 1.0)

Be specific about quantities. If unclear, lower your confidence score.
`;

    const parsedData = await base44.integrations.Core.InvokeLLM({
      prompt: parsePrompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          parts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item_name: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" }
              }
            }
          },
          labour_minutes: {
            type: "number",
            description: "Total labour time in minutes"
          },
          notes: {
            type: "string",
            description: "Additional observations or context"
          },
          confidence: {
            type: "number",
            description: "Confidence score 0.0 - 1.0"
          },
          reasoning: {
            type: "string",
            description: "Brief explanation of confidence level"
          }
        },
        required: ["parts", "labour_minutes", "confidence"]
      }
    });

    const confidence = parsedData.confidence || 0.5;

    console.log('✅ Parsed data:', parsedData);

    // Step 3: Look up pricebook items and match
    console.log('💰 Matching pricebook items...');
    const pricebookItems = await base44.entities.PricebookItem.filter({ 
      org_id,
      is_active: true 
    });

    const lineItems = [];
    let unmatchedItems = [];

    // Match parts to pricebook
    for (const part of parsedData.parts || []) {
      // Simple fuzzy matching - in production, use better matching algorithm
      const matched = pricebookItems.find(item => 
        item.item_name.toLowerCase().includes(part.item_name.toLowerCase()) ||
        part.item_name.toLowerCase().includes(item.item_name.toLowerCase())
      );

      if (matched) {
        const quantity = part.quantity || 1;
        const unitPrice = matched.unit_price;
        const markup = (matched.default_markup_pct || 20) / 100;
        const sellingPrice = unitPrice * (1 + markup);
        const total = sellingPrice * quantity;

        lineItems.push({
          description: matched.item_name,
          quantity,
          unit_price: sellingPrice,
          total,
          pricebook_item_id: matched.id
        });
      } else {
        unmatchedItems.push(part.item_name);
      }
    }

    // Add labour if present
    if (parsedData.labour_minutes && parsedData.labour_minutes > 0) {
      const labourItem = pricebookItems.find(item => 
        item.category === 'labour' || 
        item.item_name.toLowerCase().includes('labour')
      );

      if (labourItem) {
        const hours = parsedData.labour_minutes / 60;
        const unitPrice = labourItem.unit_price;
        const markup = (labourItem.default_markup_pct || 20) / 100;
        const sellingPrice = unitPrice * (1 + markup);
        const total = sellingPrice * hours;

        lineItems.push({
          description: `Labour - ${parsedData.labour_minutes} minutes`,
          quantity: hours,
          unit_price: sellingPrice,
          total,
          pricebook_item_id: labourItem.id
        });
      }
    }

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const vat_amount = subtotal * 0.20; // 20% VAT
    const total = subtotal + vat_amount;

    // Determine status based on confidence and unmatched items
    let status = 'REVIEW_REQUIRED';
    let quoteId = null;
    let quoteStatus = 'draft';

    // Lower confidence if items couldn't be matched
    const adjustedConfidence = unmatchedItems.length > 0 
      ? confidence * 0.8 
      : confidence;

    if (adjustedConfidence >= THRESHOLD_NORMAL_DRAFT && unmatchedItems.length === 0) {
      // High confidence, all items matched - create normal draft
      quoteStatus = 'draft';
      status = 'QUOTE_CREATED';
    } else if (adjustedConfidence >= THRESHOLD_CONFIRMATION) {
      // Medium confidence or some items unmatched - flag for confirmation
      quoteStatus = 'draft';
      status = 'AWAITING_CONFIRMATION';
    } else {
      // Low confidence - don't create quote
      await base44.asServiceRole.entities.VoiceNote.update(voiceNote.id, {
        status: 'REVIEW_REQUIRED',
        ai_parsed_data: parsedData
      });

      return Response.json({
        success: false,
        message: '🛑 Low confidence. Manual quote creation required.',
        voice_note_id: voiceNote.id,
        transcript,
        parsed_data: parsedData,
        confidence: adjustedConfidence,
        unmatched_items: unmatchedItems
      });
    }

    // Step 4: Create Quote
    console.log('📝 Creating quote...');
    const quote = await base44.asServiceRole.entities.Quote.create({
      org_id,
      title: `${job.title} - Voice Quote`,
      description: `🎙️ AI-Generated from voice note\n\n${parsedData.notes || ''}\n\nTranscript: "${transcript}"`,
      client_id: job.client_id,
      site_id: job.site_id,
      status: quoteStatus,
      line_items: lineItems,
      subtotal,
      vat_rate: 20,
      vat_amount,
      total,
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
      notes: unmatchedItems.length > 0 
        ? `⚠️ Unmatched items requiring attention: ${unmatchedItems.join(', ')}\n\nConfidence: ${(adjustedConfidence * 100).toFixed(0)}%\n\n${parsedData.reasoning || ''}`
        : `✅ Confidence: ${(adjustedConfidence * 100).toFixed(0)}%`
    });

    quoteId = quote.id;

    // Update job with quote reference
    await base44.asServiceRole.entities.Job.update(job_id, {
      quote_id: quote.id
    });

    // Update voice note with results
    await base44.asServiceRole.entities.VoiceNote.update(voiceNote.id, {
      status,
      quote_id: quote.id,
      ai_parsed_data: {
        ...parsedData,
        matched_items: lineItems.length,
        unmatched_items: unmatchedItems,
        adjusted_confidence: adjustedConfidence
      }
    });

    // Step 5: Publish to Redis
    await publishToRedis(`quotes.org.${org_id}`, {
      type: 'quote_created',
      quote: {
        id: quote.id,
        job_id: job.id,
        status: quoteStatus,
        total,
        source: 'voice_note',
        confidence: adjustedConfidence
      },
      timestamp: new Date().toISOString()
    });

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      org_id,
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'Quote',
      entity_id: quote.id,
      new_values: {
        source: 'voice_note',
        confidence: adjustedConfidence,
        status
      }
    });

    const message = 
      status === 'QUOTE_CREATED' 
        ? '✅ Quote created successfully' 
        : '⚠️ Low confidence. Human confirmation required.';

    return Response.json({
      success: true,
      message,
      voice_note_id: voiceNote.id,
      quote_id: quoteId,
      status,
      confidence: adjustedConfidence,
      transcript,
      parsed_data: parsedData,
      line_items: lineItems,
      unmatched_items: unmatchedItems,
      totals: {
        subtotal,
        vat_amount,
        total
      },
      published: !!REDIS_URL
    });

  } catch (error) {
    console.error('talkToQuote error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});