// Infrastructure-only health endpoint; not the school application's API.
export default {
  fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (request.method !== "GET" || !["/","/health"].includes(pathname)) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      service: "school-evidence-neon-infrastructure",
      ok: true,
      databaseUrlInjected: Boolean(process.env.DATABASE_URL),
      note: "Infrastructure check only; application API is not deployed here.",
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
};
