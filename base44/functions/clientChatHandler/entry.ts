import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

async function publishToRedis(channel, message) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('Redis not configured');
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
    }
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { client_id, message, action = 'send' } = body;

    if (!client_id) {
      return Response.json({ error: 'client_id required' }, { status: 400 });
    }

    if (action === 'send') {
      if (!message) {
        return Response.json({ error: 'message required' }, { status: 400 });
      }

      // Store message in communication events
      const msgRecord = await base44.asServiceRole.entities.CommunicationEvent.create({
        org_id: user.org_id || 'default-org',
        client_id,
        recipient: client_id,
        event_type: 'chat_message',
        status: 'sent',
        metadata: {
          message,
          sender_id: user.id,
          sender_name: user.full_name || user.email,
          timestamp: new Date().toISOString()
        }
      });

      // Publish to Redis for real-time delivery
      await publishToRedis(`client.chat.${client_id}`, {
        type: 'message',
        message,
        sender: user.full_name || user.email,
        sender_id: user.id,
        timestamp: new Date().toISOString(),
        message_id: msgRecord.id
      });

      // Log activity
      await base44.asServiceRole.entities.ClientPortalActivity.create({
        client_id,
        user_id: user.id,
        action: 'sent_chat_message',
        metadata: { message_id: msgRecord.id },
        timestamp: new Date().toISOString()
      });

      return Response.json({
        success: true,
        message_id: msgRecord.id
      });
    }

    if (action === 'history') {
      // Fetch message history
      const messages = await base44.asServiceRole.entities.CommunicationEvent.filter({
        client_id,
        event_type: 'chat_message'
      });

      const sortedMessages = messages
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
        .map(m => ({
          id: m.id,
          message: m.metadata?.message,
          sender: m.metadata?.sender_name,
          sender_id: m.metadata?.sender_id,
          timestamp: m.metadata?.timestamp || m.created_date
        }));

      return Response.json({
        success: true,
        messages: sortedMessages
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Client chat handler error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});