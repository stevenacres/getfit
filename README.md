# GetFit

A 20-minute daily workout tracker built on the DailyRepsGuy blueprint. Static frontend + Cloudflare Pages Functions API + Cloudflare D1 (SQLite) for your logged workouts.

```
getfit/
├─ index.html            # app shell
├─ styles.css            # styling (navy DailyRepsGuy identity)
├─ app.js                # movement library + randomizer + logging + timer + history
├─ manifest.json         # add-to-home-screen
├─ schema.sql            # D1 tables (run once)
├─ wrangler.toml         # Pages + D1 config
├─ .claude/launch.json   # local static preview (python http.server)
└─ functions/
   └─ api/
      └─ [[path]].js      # the API (runs on Cloudflare, talks to D1)
```

Your **movement library** lives in `app.js` (the `LIBRARY` object). Your **phases and equipment** live in the browser (localStorage, editable in the Settings tab). Your **logs** live in D1.

---

## How the workouts work

Straight from the PDF's blueprint:

1. One movement from **each body part** — Arms/Chest, Legs, Abs, Back — drawn from whatever **phase** you're in for that body part.
2. Plus **2 extra movements** for the day's focus → **6 movements** total.
3. 20-minute timer, circuit as many rounds as you can, 10–45s rest.
4. Move up a phase when the movements get easy.

| Day | Focus |
|-----|-------|
| Monday | Arms / Chest |
| Tuesday | Legs |
| Wednesday | Abs / Core |
| Thursday | Back |
| Friday | Full body (extras come from two random body parts) |

**Phases** are per body part — the PDF is explicit that you might be Phase 3 for legs and Phase 1 for back. Set each one in the **Settings** tab. Phase 4 (Pro) draws from the Phase 3 pool and flags "add weight", exactly as the PDF describes it.

**Equipment** is a set of toggles in Settings; movements you don't have the kit for never get picked. Ships configured for dumbbells, EZ curl bar, bench and a pull-up/dip station, with **kettlebells off** — flip that on when yours arrive and ~15 kettlebell movements unlock across the four body parts.

### Randomization

- The week's six-movement list is **randomized per day and fixed for the week**, so Tuesday looks the same whether you check it Monday night or Tuesday morning. A new week rolls a fresh set automatically.
- **⟳ Re-roll this day** — rebuilds that whole day.
- **⟳ Swap** on any movement — replaces just that one with a different movement **from the same body part and phase**, so a core movement always swaps for another core movement. Anything you've already typed into the other cards is preserved.
- **⟳ Re-roll the whole week** in Settings.

Re-rolls and swaps are remembered per week in localStorage (per device — they don't sync between your phone and desktop).

---

## Deploy — the no-terminal path (recommended)

You don't need Node or the command line for this. Everything is done in the Cloudflare dashboard.

### 1. Push this code to your GitHub repo
Upload these files to `https://github.com/stevenacres/getfit` (drag-and-drop in the GitHub web UI works, or use GitHub Desktop). Keep the folder structure exactly as above.

### 2. Create the D1 database
1. Cloudflare dashboard → **Storage & Databases → D1** → **Create database**.
2. Name it **`getfit-db`** → Create.
3. Open it → **Console** tab → paste the entire contents of `schema.sql` → **Execute**. This creates your two tables.

### 3. Create the Pages project (connect GitHub)
1. Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick the **`getfit`** repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/`
4. **Save and Deploy.** In ~30 seconds you'll get a URL like `getfit.pages.dev`.

### 4. Bind the database to the app
1. Your Pages project → **Settings → Functions → D1 database bindings** (may be under "Bindings").
2. **Add binding:** Variable name **`DB`** → Database **`getfit-db`** → Save.
3. Go to **Deployments** → **Retry deployment** (bindings apply on the next deploy).

### 5. Use it
Open your `*.pages.dev` URL on your phone → Share → **Add to Home Screen**. It opens full-screen like an app. Test it: log a set, hit **Save workout**, then check the **History** tab.

> Quick check: visiting `your-url.pages.dev/api/health` should show `{"ok":true}`. If it shows a database error, the `DB` binding in step 4 isn't set (or the deploy wasn't retried).

---

## Deploy — the Wrangler CLI path (optional)

If you'd rather use the terminal (needs [Node.js](https://nodejs.org)):

```bash
npm install -g wrangler
wrangler login

# create the database, then copy the printed database_id into wrangler.toml
wrangler d1 create getfit-db

# create the tables on the remote database
wrangler d1 execute getfit-db --remote --file=./schema.sql

# run locally (uses a local copy of the DB)
wrangler pages dev

# deploy
wrangler pages deploy
```

---

## Making changes

- **Change your phases or equipment:** the **Settings** tab in the app. No code, no redeploy.
- **Add or edit movements:** edit the `LIBRARY` object at the top of `app.js` — it's keyed by body part, then phase. Each movement is `{ name, target, info, equip: [] }`, where `equip` lists what it needs (`dumbbell`, `ezbar`, `bench`, `station`, `kettlebell`); leave it off for bodyweight. Push to GitHub — Pages redeploys automatically.
- **Change the week's focus days:** the `WEEK` object in `app.js`.
- **Preview locally:** `python -m http.server 8788` in the project root, then open `http://localhost:8788`. The `/api/*` calls 404 without D1, which the app handles — the Workout and Settings tabs work fine.
- **Change the look:** it's all in `styles.css`. The color tokens are at the top (`:root`).
- **See your data:** D1 → your database → **Console**, e.g. `SELECT * FROM sessions ORDER BY date DESC;`

## Notes

- **This app has no login.** It's built for one person (you). Anyone who has the URL could add entries. That's usually fine for a personal tracker — but if you want it locked to just you, add **Cloudflare Access** (Zero Trust → free tier) in front of the Pages project; it gates the whole site behind your Google/email login with zero code changes.
- **Backups:** D1 keeps 30-day point-in-time recovery automatically, so a bad delete is recoverable.
- **Cost:** comfortably inside Cloudflare's free tier — a lifetime of workout logs is a few megabytes.
