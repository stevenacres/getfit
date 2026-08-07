# GetFit

A 20-minute daily workout tracker. Static frontend + Cloudflare Pages Functions API + Cloudflare D1 (SQLite) for your logged workouts.

```
getfit/
├─ index.html            # app shell
├─ styles.css            # styling (navy DailyRepsGuy identity)
├─ app.js                # regimen data + logging + timer + history
├─ manifest.json         # add-to-home-screen
├─ schema.sql            # D1 tables (run once)
├─ wrangler.toml         # Pages + D1 config
└─ functions/
   └─ api/
      └─ [[path]].js      # the API (runs on Cloudflare, talks to D1)
```

Your workout **plan** lives in `app.js` (edit the `PLAN` object anytime). Your **logs** live in D1.

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

- **Change the workouts:** edit the `PLAN` object at the top of `app.js`, push to GitHub — Pages redeploys automatically.
- **Change the look:** it's all in `styles.css`. The color tokens are at the top (`:root`).
- **See your data:** D1 → your database → **Console**, e.g. `SELECT * FROM sessions ORDER BY date DESC;`

## Notes

- **This app has no login.** It's built for one person (you). Anyone who has the URL could add entries. That's usually fine for a personal tracker — but if you want it locked to just you, add **Cloudflare Access** (Zero Trust → free tier) in front of the Pages project; it gates the whole site behind your Google/email login with zero code changes.
- **Backups:** D1 keeps 30-day point-in-time recovery automatically, so a bad delete is recoverable.
- **Cost:** comfortably inside Cloudflare's free tier — a lifetime of workout logs is a few megabytes.
