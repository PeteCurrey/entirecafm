import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

const clients = new Map();
const rateLimits = new Map();

function checkRateLimit(clientId) {
  const now = Date.now();
  const limit = rateLimits.get(clientId) || { count: 0, window: now };
  
  if (now - limit.window > 1000) {
    limit.count = 0;
    limit.window = now;
  }
  
  limit.count++;
  rateLimits.set(clientId, limit);
  return limit.count <= 10;
}

async function subscribeToRedis(topic, callback) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('Redis not configured');
    return null;
  }

  console.log(`🔔 Subscribing to Redis topic: ${topic}`);

  const response = await fetch(`${REDIS_URL}/subscribe/${topic}`, {
    headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` },
  });

  if (!response.ok) {
    throw new Error(`Redis subscribe failed: ${response.statusText}`);
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
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");

  if (!orgId) {
    return new Response("Missing orgId", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = async () => {
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();
      
      if (!user || user.org_id !== orgId) {
        socket.close(1008, "Unauthorized");
        return;
      }

      const clientId = `${user.id}-${orgId}-${Date.now()}`;
      clients.set(clientId, { socket, orgId, userId: user.id });

      console.log(`✅ Client connected: ${clientId}`);

      const topics = [
        `map.org.${orgId}`,
        `jobs.org.${orgId}`,
        `director.org.${orgId}`,
        `pafe.org.${orgId}`,
        `compliance.org.${orgId}`,
        `sustainability.org.${orgId}`,
        `client.chat.${orgId}`
      ];

      const unsubscribers = await Promise.all(
        topics.map(topic => 
          subscribeToRedis(topic, (message) => {
            for (const [cId, client] of clients.entries()) {
              if (client.orgId === orgId && client.socket.readyState === 1) {
                if (!checkRateLimit(cId)) continue;
                try {
                  client.socket.send(JSON.stringify({ topic, ...message }));
                } catch (err) {
                  console.error(`Send error:`, err);
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
        rateLimits.delete(clientId);
        unsubscribers.forEach(unsub => unsub?.());
        console.log(`❌ Client disconnected: ${clientId}`);
      };

    } catch (error) {
      console.error('WebSocket auth error:', error);
      socket.close(1008, "Authentication failed");
    }
  };

  socket.onerror = (error) => console.error("WebSocket error:", error);

  return response;
});