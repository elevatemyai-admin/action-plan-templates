# Contest Template — Animal Art Contest Microsite

Reusable submission + live-voting + auto-leaderboard system for a kids'-art
contest. Fill in the placeholders below for each new client — nothing else
in this repo needs to change.

**Who this is for:** written assuming you've never used Vercel, GitHub, or
Airtable before. If you have, skip ahead — but every click is spelled out
so someone else on the team can run this without you standing over their
shoulder.

## What's built (this repo)

| Piece | File | What it does |
|---|---|---|
| Landing page | `public/index.html` | Hero, "how it works," submission form, live gallery + vote counter |
| Submission handler | `api/submit-entry.js` | Uploads the photo to Vercel Blob, writes a "Pending" row to Airtable |
| Gallery/counter feed | `api/entries.js` | Returns all Approved entries + vote counts (polled every 25s by the page) |
| Vote webhook | `api/vote-webhook.js` | Called by Make.com when a Zeffy donation comes in; adds votes to the matching entry |
| Leaderboard image | `api/leaderboard-image.js` | Auto-renders a branded PNG of current standings — this is the URL Buffer posts |
| Airtable helper | `api/_airtable.js` | Shared functions the other four files call — no need to edit this per client |

All four `/api` functions run on Vercel's **Edge runtime**, not classic Node
serverless — that's what lets `submit-entry.js` read the uploaded photo
directly. You don't need to know what that means to set this up, just don't
delete the `export const config = { runtime: "edge" }` line in those files.

---

## Setup, start to finish

Do these in order — each step depends on the one before it.

### Step 0: Put the code on GitHub

1. Go to **github.com** and log in (or create a free account)
2. Click the **+** icon top-right → **New repository**
3. Name it something like `alpine-acres-contest` → set it to **Private** →
   click **Create repository**
4. On the new, empty repo's page, click **uploading an existing file**
5. Drag in every file and folder from this project (`api/`, `public/`,
   `package.json`, `package-lock.json`, `README.md`, `.gitignore`)
6. Scroll down, click **Commit changes**

*(If someone on the team is comfortable with git/command line, cloning and
pushing works too — but the drag-and-drop upload above needs nothing
installed.)*

### Step 1: Deploy it on Vercel

1. Go to **vercel.com** and log in (or create a free account) — easiest to
   sign up using the same GitHub account from Step 0
2. Click **Add New...** (top right) → **Project**
3. Find the repo you just created (`alpine-acres-contest`) in the list and
   click **Import**
4. Under **Framework Preset**, choose **Other** (this project doesn't use
   Next.js, React, or any framework — it's plain HTML + Edge functions)
5. Leave everything else as default and click **Deploy**
6. It'll fail or show a broken page right now — that's expected, because the
   environment variables from Step 4 don't exist yet. Keep going.

You'll now have a live URL that looks like
`alpine-acres-contest.vercel.app` — that's your project's home in Vercel
going forward.

### Step 2: Create the Airtable base

Airtable's API can't create tables or fields on a brand-new base, so this
part has to happen by hand, every time, for every client:

1. Go to **airtable.com** and log in (or create a free account)
2. Click **Create a base** → **Start from scratch**
3. Name it **"[Client] Contest Entries"**
4. Rename the default table (bottom-left, double-click the tab) to **`Entries`**
5. Delete the default columns Airtable adds, then add these fields exactly —
   click the **+** to the right of the last column each time:

   | Field name | Field type | Notes |
   |---|---|---|
   | `Child Name` | Single line text | |
   | `Age` | Number → set to **Integer** | |
   | `Animal` | Single line text | |
   | `Photo` | Attachment | |
   | `Parent Email` | Email | |
   | `Status` | Single select | Add 3 options: `Pending`, `Approved`, `Rejected` |
   | `Votes` | Number → **Integer** | Set default value to `0` |
   | `Entry Code` | Formula | Formula: `"CL-" & RIGHT("000" & RECORD_ID(), 3)` — swap "CL" for a 2-letter code for this client |

6. Click the **grid view** icon (top-left, looks like a table) and drag the
   `Photo` column so it's near the front — Airtable shows photo thumbnails
   right in this view, which is what makes approving entries fast (glance at
   the photo, click `Status`, change it to `Approved`)

### Step 3: Get your Airtable credentials

1. Still in Airtable, click your profile icon (top-right) → **Developer hub**
2. Click **Personal access tokens** → **Create new token**
3. Name it anything (e.g. "Contest Template")
4. Under **Scopes**, add `data.records:read` and `data.records:write`
5. Under **Access**, add the specific base you just created (not "all bases")
6. Click **Create token** — **copy it immediately**, Airtable only shows it once
7. Now find your **Base ID**: open your base, click **Help** (top-right, "?"
   icon) → **API documentation** — the Base ID starts with `app` and is shown
   right at the top

You should now have two things copied somewhere safe: the token (starts with
`pat...`) and the Base ID (starts with `app...`).

### Step 4: Add the environment variables in Vercel

1. Go back to **vercel.com** and open your project
2. Click **Settings** in the top nav
3. Click **Environment Variables** in the left sidebar
4. Add each of these one at a time — type the name, paste the value, leave
   it checked for all environments, click **Save**:

   | Variable name | Value |
   |---|---|
   | `AIRTABLE_API_KEY` | the `pat...` token from Step 3 |
   | `AIRTABLE_BASE_ID` | the `app...` ID from Step 3 |
   | `WEBHOOK_SECRET` | make up any random password-like string |

5. **Enable Blob storage** (this creates the last variable automatically):
   - Click **Storage** in the top nav (still inside your Vercel project)
   - Click **Create Database** → choose **Blob** → click **Continue** → **Create**
   - Once created, click **Connect Project** and select this project —
     Vercel automatically adds a `BLOB_READ_WRITE_TOKEN` variable for you,
     no copy-pasting needed

### Step 5: Redeploy

Adding environment variables doesn't automatically update your live site —
it needs one more deploy to pick them up:

1. Click **Deployments** in the top nav
2. Find the most recent deployment, click the **⋯** (three dots) on the right
3. Click **Redeploy** → confirm

Your site is now live and fully wired to Airtable.

### Step 6: Set up Zeffy (needs your Zeffy login)

1. Log into Zeffy, create a new custom donation form
2. Add a dropdown field listing each approved entry, formatted like:
   `CL-014 — Example Entry Title by Firstname, age 9` (the `CL-014` part must match the
   `Entry Code` field in Airtable exactly)
3. Set suggested donation amounts: $1 / $5 / $10
4. Update this dropdown as new entries get approved
5. Copy the form's public link — you'll add this as the "Vote Now" link on
   the landing page

### Step 7: Set up Make.com (needs your Make.com login)

1. Log into Make.com, click **Create a new scenario**
2. Add a trigger that watches for new Zeffy donations (via Zeffy's own
   integration if it has one, or by watching the donation-receipt email if not)
3. Add a step that pulls the entry code and dollar amount out of that donation
4. Add an **HTTP** module → **Make a request**:
   - URL: `https://[your-vercel-domain]/api/vote-webhook`
   - Method: `POST`
   - Body type: `JSON`
   - Body:
     ```json
     { "entryCode": "CL-014", "amount": 5, "secret": "[your WEBHOOK_SECRET from Step 4]" }
     ```
     (map `entryCode` and `amount` to the values from step 3 above, rather
     than hardcoding them)
5. Turn the scenario **on**

### Step 8: Connect Buffer (needs your Buffer login)

Point a scheduled post, 2–3x/week, at:
`https://[your-vercel-domain]/api/leaderboard-image`

Buffer fetches and posts whatever the image looks like at send time — since
it's generated live from Airtable, there's nothing to manually update before
each post.

### Step 9: Test everything end-to-end before telling anyone it's live

- [ ] Submit a real test entry through the live form
- [ ] Go to Airtable, find it, change `Status` to `Approved`
- [ ] Refresh the landing page — confirm the entry appears in the gallery
      within ~25 seconds
- [ ] Submit a test donation through the Zeffy form with the matching entry code
- [ ] Confirm the vote count on the landing page goes up
- [ ] Visit `/api/leaderboard-image` directly in a browser tab and confirm
      it shows the test entry

---

## Reusing this for the next client

Everything below needs to change per client; everything not listed here
copies over unchanged:

- The animal dropdown list in `public/index.html`
- The brand colors in `public/index.html` and `api/leaderboard-image.js`
- The Airtable base (new base, Steps 2–3, per client)
- The Zeffy form and Make.com scenario (Steps 6–7, per client)
- The Vercel project + repo (Steps 0–1, per client)
