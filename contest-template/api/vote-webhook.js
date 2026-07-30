// api/vote-webhook.js
// POST /api/vote-webhook  (Edge runtime)
// Called by a Make.com scenario watching for new Zeffy donations.
//
// Expected JSON body: { entryCode: "AA-014", amount: 5, secret: "..." }
//
// "entryCode" should be a short code shown on the Zeffy form dropdown next to
// each entry's name (e.g. "CL-014 — Example Entry Title by Firstname, age 9") so Make.com
// can parse it out of the donation's form-response text and pass it straight
// through — no manual matching required.
//
// Every $1 of the donation amount = 1 vote by default; change VOTE_UNIT below
// for a different ratio (e.g. set to null for "1 donation = 1 vote" regardless
// of amount).

import { findEntryByCode, incrementVotes } from "./_airtable.js";

export const config = { runtime: "edge" };

const VOTE_UNIT = 1; // dollars per vote; set to null for "1 donation = 1 vote"

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ error: "Use POST" }, 405);
  }

  try {
    const body = await request.json();
    const { entryCode, amount, secret } = body || {};

    // Simple shared-secret check so this endpoint can't be hit by anyone who
    // finds the URL. Set WEBHOOK_SECRET in Vercel and paste the same value
    // into the Make.com HTTP module's request body.
    if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
      return json({ error: "Invalid or missing secret." }, 401);
    }

    if (!entryCode) return json({ error: "entryCode is required." }, 400);

    const entry = await findEntryByCode(entryCode);
    if (!entry) {
      // Don't fail loudly — log it so a typo'd code can be caught, but return
      // 200 so Make.com doesn't retry forever on a bad match.
      console.warn(`vote-webhook: no entry found for code "${entryCode}"`);
      return json({ matched: false });
    }

    const votesToAdd = VOTE_UNIT ? Math.max(1, Math.round(Number(amount) / VOTE_UNIT)) : 1;
    const updated = await incrementVotes(entry.id, entry.votes, votesToAdd);

    return json({ matched: true, entryId: updated.id, votes: updated.votes });
  } catch (err) {
    console.error("vote-webhook error:", err);
    return json({ error: "Could not record this vote." }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
