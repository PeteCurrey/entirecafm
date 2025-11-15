import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

const clients = new Map();

async function subscribeToRedis(topic, callback) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('⚠️ Redis not configured');
    return null;
  }

  console.log(`🔔 Subscribing to Redis: ${topic}`);

  const response = await fetch(`${REDIS_URL}/subscribe/${topic}`, {
    headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` },
  });

  if (!response.ok) {
    console.error(`❌ Redis subscribe failed: ${response.statusText}`);
    return null;
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  (async () => {
    try {
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              callback(data);
            } catch (err) {
              console.error('Parse error:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Redis subscription error:', err);
    }
  })();

  return () => reader?.cancel();
}

Deno.serve((req) => {
  console.log(`📡 WS Request: ${req.url}`);
  
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket", { status: 400 });
  }

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");

  if (!orgId) {
    return new Response("Missing orgId", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = async () => {
    console.log(`🔌 WebSocket opened for org: ${orgId}`);
    
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();
      
      if (!user) {
        console.error('❌ No authenticated user');
        socket.close(1008, "No user");
        return;
      }
      
      if (user.org_id !== orgId) {
        console.error(`❌ Org mismatch: ${user.org_id} !== ${orgId}`);
        socket.close(1008, "Org mismatch");
        return;
      }

      const clientId = `${user.id}-${Date.now()}`;
      clients.set(clientId, { socket, orgId });

      console.log(`✅ Client ${clientId} connected`);

      const topics = [
        `map.org.${orgId}`,
        `director.org.${orgId}`,
        `compliance.org.${orgId}`
      ];

      const unsubscribers = await Promise.all(
        topics.map(topic => 
          subscribeToRedis(topic, (message) => {
            for (const [cId, client] of clients.entries()) {
              if (client.orgId === orgId && client.socket.readyState === 1) {
                try {
                  client.socket.send(JSON.stringify({ topic, ...message }));
                } catch (err) {
                  console.error('Send error:', err);
                }
              }
            }
          })
        )
      );

      socket.send(JSON.stringify({
        type: 'connected',
        orgId,
        topics,
        timestamp: new Date().toISOString()
      }));

      socket.onclose = () => {
        clients.delete(clientId);
        unsubscribers.forEach(unsub => unsub?.());
        console.log(`❌ Client ${clientId} disconnected`);
      };

    } catch (error) {
      console.error('❌ Auth error:', error);
      socket.close(1008, error.message);
    }
  };

  socket.onerror = (error) => console.error("❌ WS error:", error);

  return response;
});