// api/submit-entry.js
// POST /api/submit-entry  (Edge runtime — needed so we can use the standard
// Fetch API's request.formData(), which classic Node serverless functions
// don't support natively)
//
// multipart/form-data fields: childName, age, animal, parentEmail, consent, photo (file)
//
// Flow: photo goes to Vercel Blob storage first (so Airtable just stores a
// URL, not the raw file), then a new "Pending" row is created in Airtable
// for the moderation queue.

import { put } from "@vercel/blob";
import { createEntry } from "./_airtable.js";

export const config = { runtime: "edge" };

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ error: "Use POST" }, 405);
  }

  try {
    const formData = await request.formData();

    const childName = (formData.get("childName") || "").toString().trim();
    const age = parseInt(formData.get("age"), 10);
    const animal = (formData.get("animal") || "").toString().trim();
    const parentEmail = (formData.get("parentEmail") || "").toString().trim();
    const consent = formData.get("consent");
    const photo = formData.get("photo");

    // --- basic validation, plain-language errors ---
    const errors = [];
    if (!childName) errors.push("Child's first name is required.");
    if (!age || age < 1 || age > 18) errors.push("Please enter a valid age (1–18).");
    if (!animal) errors.push("Please choose which animal this design is for.");
    if (!parentEmail || !parentEmail.includes("@"))
      errors.push("A valid parent/guardian email is required.");
    if (!consent) errors.push("Consent to display this artwork publicly is required.");
    if (!photo || typeof photo === "string")
      errors.push("Please attach a photo of the artwork.");

    if (errors.length) return json({ error: errors.join(" ") }, 400);
    if (photo.size > 8 * 1024 * 1024) return json({ error: "Photo must be under 8MB." }, 400);

    // --- upload photo to Vercel Blob ---
    const safeName = childName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const filename = `entries/${Date.now()}-${safeName}-${photo.name}`;
    const blob = await put(filename, photo, {
      access: "public",
      contentType: photo.type,
    });

    // --- create the Airtable row (status: Pending, awaiting moderation) ---
    const entry = await createEntry({
      childName,
      age,
      animal,
      photoUrl: blob.url,
      parentEmail,
    });

    return json({
      success: true,
      message:
        "Thank you! Your artwork has been submitted and is waiting for a quick review before it goes live.",
      entryId: entry.id,
    });
  } catch (err) {
    console.error("submit-entry error:", err);
    return json(
      {
        error:
          "Something went wrong on our end — please try again in a minute, or email us the photo directly.",
      },
      500
    );
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
