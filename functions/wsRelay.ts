import { createClient } from 'npm:@base44/sdk@0.8.4';

/**
 * WebSocket Relay Server for EntireCAFM Real-time Updates
 * 
 * Subscribes to Redis topics and broadcasts to connected WebSocket clients
 * Topics: map.org.<orgId>, jobs.org.<orgId>, approvals.org.<orgId>
 * 
 * Auth: JWT token from Base44 (validated against Base44 auth)
 * Rate limiting: Drop messages if client receives >10/sec
 */

const REDIS_URL = Deno.env.get("REDIS_URL");
const REDIS_TOKEN = Deno.env.get("REDIS_TOKEN");
const BASE44_APP_ID = Deno.env.get("BASE44_APP_ID");

// In-memory client registry (production would use Redis for distributed state)
const clients = new Map();

// Rate limiting tracker
const rateLimits = new Map();

function checkRateLimit(clientId) {
  const now = Date.now();
  const limit = rateLimits.get(clientId) || { count: 0, window: now };
  
  // Reset window every second
  if (now - limit.window > 1000) {
    limit.count = 0;
    limit.window = now;
  }
  
  limit.count++;
  rateLimits.set(clientId, limit);
  
  // Drop if >10 messages per second
  return limit.count <= 10;
}

async function subscribeToRedis(topic, callback) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('Redis not configured');
    return null;
  }

  // Upstash Redis supports Server-Sent Events for pub/sub
  const response = await fetch(`${REDIS_URL}/subscribe/${topic}`, {
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
    },
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

Deno.serve({ port: 8080 }, (req) => {
  // WebSocket upgrade check
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const orgId = url.searchParams.get("orgId");

  if (!token || !orgId) {
    return new Response("Missing token or orgId", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = async () => {
    try {
      // Validate JWT token with Base44
      const base44 = createClient({ 
        appId: BASE44_APP_ID,
        apiKey: token 
      });
      
      const user = await base44.auth.me();
      
      if (!user) {
        socket.close(1008, "Invalid token");
        return;
      }

      // Verify org access
      if (user.org_id !== orgId) {
        socket.close(1008, "Org mismatch");
        return;
      }

      const clientId = `${user.id}-${orgId}-${Date.now()}`;
      
      // Register client
      clients.set(clientId, {
        socket,
        orgId,
        userId: user.id,
        connectedAt: new Date(),
      });

      console.log(`Client connected: ${clientId} (org: ${orgId})`);

      // Subscribe to Redis topics for this org
      const topics = [
        `map.org.${orgId}`,
        `jobs.org.${orgId}`,
        `approvals.org.${orgId}`,
      ];

      const unsubscribers = await Promise.all(
        topics.map(topic => 
          subscribeToRedis(topic, (message) => {
            // Broadcast to matching clients
            for (const [cId, client] of clients.entries()) {
              if (client.orgId === orgId && client.socket.readyState === 1) {
                // Check rate limit
                if (!checkRateLimit(cId)) {
                  console.warn(`Rate limit exceeded for ${cId}`);
                  continue;
                }
                
                try {
                  client.socket.send(JSON.stringify({
                    topic,
                    ...message,
                  }));
                } catch (err) {
                  console.error(`Send error to ${cId}:`, err);
                }
              }
            }
          })
        )
      );

      // Send connected confirmation
      socket.send(JSON.stringify({
        type: 'connected',
        orgId,
        topics,
        timestamp: new Date().toISOString(),
      }));

      // Cleanup on close
      socket.onclose = () => {
        clients.delete(clientId);
        rateLimits.delete(clientId);
        unsubscribers.forEach(unsub => unsub?.());
        console.log(`Client disconnected: ${clientId}`);
      };

    } catch (error) {
      console.error('WebSocket auth error:', error);
      socket.close(1008, "Authentication failed");
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return response;
});