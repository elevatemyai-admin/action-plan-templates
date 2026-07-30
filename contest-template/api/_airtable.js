// api/_airtable.js
// Thin wrapper around the Airtable REST API using plain fetch — works in
// Vercel's Edge runtime (no Node-only APIs, no SDK dependency).
//
// Required env vars (set in Vercel project settings):
//   AIRTABLE_API_KEY   - a personal access token with data.records:read/write
//                         scope on the base below
//   AIRTABLE_BASE_ID    - starts with "app..." — found in the Airtable API docs
//                         page for your base
//   AIRTABLE_TABLE_NAME - defaults to "Entries" if not set

const AIRTABLE_API_URL = "https://api.airtable.com/v0";

function getConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE_NAME || "Entries";
  if (!apiKey || !baseId) {
    throw new Error(
      "Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID environment variables"
    );
  }
  return { apiKey, baseId, table };
}

async function airtableRequest(path, options = {}) {
  const { apiKey, baseId } = getConfig();
  const url = `${AIRTABLE_API_URL}/${baseId}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable request failed (${res.status}): ${body}`);
  }
  return res.json();
}

// Fetch every record where Status = "Approved", sorted by vote count desc.
export async function getApprovedEntries() {
  const { table } = getConfig();
  const filterFormula = encodeURIComponent(`{Status} = "Approved"`);
  const path = `/${encodeURIComponent(
    table
  )}?filterByFormula=${filterFormula}&sort[0][field]=Votes&sort[0][direction]=desc&pageSize=100`;
  const data = await airtableRequest(path);
  return data.records.map(recordToEntry);
}

// Create a new entry with Status = "Pending" — the moderation queue.
export async function createEntry({ childName, age, animal, photoUrl, parentEmail }) {
  const { table } = getConfig();
  const body = {
    fields: {
      "Child Name": childName,
      Age: age,
      Animal: animal,
      Photo: [{ url: photoUrl }],
      "Parent Email": parentEmail,
      Status: "Pending",
      Votes: 0,
    },
  };
  const data = await airtableRequest(`/${encodeURIComponent(table)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return recordToEntry(data);
}

// Find one entry by its human-friendly Entry Code (shown on the Zeffy form).
export async function findEntryByCode(entryCode) {
  const { table } = getConfig();
  const filterFormula = encodeURIComponent(`{Entry Code} = "${entryCode}"`);
  const path = `/${encodeURIComponent(
    table
  )}?filterByFormula=${filterFormula}&maxRecords=1`;
  const data = await airtableRequest(path);
  if (!data.records.length) return null;
  return recordToEntry(data.records[0]);
}

// Increment the Votes field on a record by a given amount (default 1).
export async function incrementVotes(recordId, currentVotes, amount = 1) {
  const { table } = getConfig();
  const body = { fields: { Votes: (currentVotes || 0) + amount } };
  const data = await airtableRequest(
    `/${encodeURIComponent(table)}/${recordId}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  return recordToEntry(data);
}

function recordToEntry(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    childName: f["Child Name"] || "",
    age: f["Age"] || null,
    animal: f["Animal"] || "",
    photoUrl: (f["Photo"] && f["Photo"][0] && f["Photo"][0].url) || null,
    status: f["Status"] || "Pending",
    votes: f["Votes"] || 0,
    entryCode: f["Entry Code"] || record.id,
  };
}
