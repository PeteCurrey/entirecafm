import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio');
    const sessionId = formData.get('session_id');

    if (!audioFile) {
      return Response.json({ error: 'audio file required' }, { status: 400 });
    }

    const orgId = user.org_id || 'default-org';

    console.log('🎤 Processing voice input...');

    // Upload audio file
    const uploadResult = await base44.integrations.Core.UploadFile({ file: audioFile });
    const audioUrl = uploadResult.file_url;

    // Transcribe using LLM with audio context
    console.log('📝 Transcribing audio...');
    const transcriptionResult = await base44.integrations.Core.InvokeLLM({
      prompt: 'Transcribe this audio recording. The user is asking a question about their facilities management operations. Provide only the transcription text.',
      file_urls: [audioUrl]
    });

    const transcript = typeof transcriptionResult === 'string' 
      ? transcriptionResult 
      : transcriptionResult.transcription || transcriptionResult.text || '';

    console.log('✅ Transcript:', transcript);

    // Forward to chat handler
    const chatResponse = await base44.asServiceRole.functions.invoke('aiChatHandler', {
      message: transcript,
      session_id: sessionId
    });

    const response = chatResponse.data?.response || 'I could not process that request.';

    // Generate TTS audio (using simple synthesis for now)
    // In production, integrate ElevenLabs or similar
    const ttsText = response.replace(/[^\w\s.,!?-]/g, ''); // Clean for TTS
    
    console.log(`✅ Voice response: "${response}"`);

    return Response.json({
      success: true,
      transcript,
      response,
      audio_url: audioUrl,
      session_id: chatResponse.data?.session_id,
      tts_text: ttsText,
      confidence: chatResponse.data?.confidence
    });

  } catch (error) {
    console.error('aiVoiceHandler error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});