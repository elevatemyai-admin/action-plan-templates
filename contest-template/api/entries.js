// api/entries.js
// GET /api/entries  (Edge runtime)
// Returns all Approved entries, sorted by current vote count, descending.
// This is what the landing page polls every 20–30 seconds for the live counter.

import { getApprovedEntries } from "./_airtable.js";

export const config = { runtime: "edge" };

export default async function handler(request) {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Use GET" }), { status: 405 });
  }

  try {
    const entries = await getApprovedEntries();
    return new Response(JSON.stringify({ entries }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache briefly at the edge so a burst of visitors doesn't hammer
        // Airtable's rate limit (5 req/sec per base) — safe since the client
        // itself only polls every 25s anyway.
        "Cache-Control": "s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    console.error("entries error:", err);
    return new Response(JSON.stringify({ error: "Could not load entries right now." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
