// api/leaderboard-image.js
// GET /api/leaderboard-image  (Edge runtime — required by @vercel/og)
// Renders a branded PNG showing the current top entries — this is the URL
// Buffer schedules to post 2-3x/week. No one designs this by hand; it always
// reflects live standings the moment it's requested.
//
// ============================================================
// EDIT THIS BLOCK PER CLIENT — everything else below can stay as-is
// ============================================================
const CONFIG = {
  contestName: "[CLIENT NAME] ART CONTEST",
  voteUrl: "Vote at [client-domain.com]/contest",
  colors: {
    background: "#2F4D3A", // dark background color
    accent: "#D98A5C",     // eyebrow text ("[CLIENT NAME] ART CONTEST")
    rank: "#C1652F",       // the "#1", "#2" etc. numbers
    text: "#FAF6EE",       // main light text
    votes: "#8CA989",      // the vote count color
  },
};
// ============================================================

import { ImageResponse } from "@vercel/og";
import { getApprovedEntries } from "./_airtable.js";

export const config = { runtime: "edge" };

export default async function handler() {
  let entries = [];
  try {
    entries = await getApprovedEntries();
  } catch (err) {
    console.error("leaderboard-image: could not load entries", err);
  }

  const top5 = entries.slice(0, 5);
  const c = CONFIG.colors;

  // NOTE: no JSX here on purpose — this is a plain Vercel /api project with
  // no Next.js/Babel build step, so JSX wouldn't get transformed. @vercel/og
  // (via Satori) accepts this same structure as a plain object tree instead.
  const el = (type, props, ...children) => ({
    type,
    props: { ...props, children: children.length === 1 ? children[0] : children },
  });

  const rows = top5.map((entry, i) =>
    el(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "18px 24px",
        },
      },
      el("div", { style: { fontSize: 34, fontWeight: 700, color: c.rank, width: 60, display: "flex" } }, `#${i + 1}`),
      el(
        "div",
        { style: { display: "flex", flexDirection: "column", flex: 1 } },
        el(
          "div",
          { style: { fontSize: 26, color: c.text, fontWeight: 600, display: "flex" } },
          `${entry.childName || "Anonymous Artist"} — ${entry.animal}`
        )
      ),
      el(
        "div",
        { style: { fontSize: 30, color: c.votes, fontWeight: 700, display: "flex" } },
        `${entry.votes} votes`
      )
    )
  );

  const tree = el(
    "div",
    {
      style: {
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: c.background,
        padding: "60px 70px",
        fontFamily: "sans-serif",
      },
    },
    el("div", { style: { fontSize: 28, color: c.accent, fontWeight: 700, letterSpacing: 2, display: "flex" } }, CONFIG.contestName),
    el(
      "div",
      { style: { fontSize: 52, color: c.text, fontWeight: 700, marginTop: 10, marginBottom: 36, display: "flex" } },
      "This Week's Leaderboard"
    ),
    el("div", { style: { display: "flex", flexDirection: "column", gap: 18 } }, ...rows),
    el(
      "div",
      { style: { marginTop: "auto", fontSize: 20, color: "rgba(250,246,238,0.6)", display: "flex" } },
      CONFIG.voteUrl
    )
  );

  return new ImageResponse(tree, { width: 1200, height: 630 });
}
