Deno.serve(async (req) => {
  try {
    return new Response(JSON.stringify({ 
      ok: true, 
      ts: Date.now(),
      status: "healthy"
    }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "Content-Type"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      ok: false, 
      error: error.message 
    }), {
      status: 500,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      }
    });
  }
});