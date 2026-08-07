// GetFit API — Cloudflare Pages Function (catch-all at /api/*)
// The D1 database is bound to this project as `env.DB`.
// Routes:
//   GET    /api/health
//   GET    /api/sessions            -> recent sessions (summary)
//   POST   /api/sessions            -> create a session + its entries
//   GET    /api/sessions/:id        -> one session with its entries
//   DELETE /api/sessions/:id        -> delete a session
//   GET    /api/last?movements=a,b  -> last logged sets per movement

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function onRequest(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) {
    return json(
      { error: "No database found. Add a D1 binding named DB to this Pages project." },
      500
    );
  }

  const url = new URL(request.url);
  const parts = (params.path || []).filter(Boolean); // e.g. ["sessions", "12"]
  const method = request.method;

  try {
    // GET /api/health
    if (parts[0] === "health") return json({ ok: true });

    // /api/sessions
    if (parts[0] === "sessions" && parts.length === 1) {
      if (method === "GET") {
        const { results } = await db
          .prepare(
            `SELECT s.id, s.date, s.day_key, s.focus, s.rounds, s.notes,
                    COUNT(e.id) AS entry_count
             FROM sessions s
             LEFT JOIN entries e ON e.session_id = s.id
             GROUP BY s.id
             ORDER BY s.date DESC, s.id DESC
             LIMIT 60`
          )
          .all();
        return json({ sessions: results });
      }

      if (method === "POST") {
        const body = await request.json();
        const { date, day_key, focus, rounds, notes, entries } = body || {};
        if (!date || !day_key) {
          return json({ error: "date and day_key are required" }, 400);
        }

        const res = await db
          .prepare(
            `INSERT INTO sessions (date, day_key, focus, rounds, notes)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(date, day_key, focus ?? null, rounds ?? null, notes ?? null)
          .run();

        const sessionId = res.meta.last_row_id;

        if (Array.isArray(entries) && entries.length) {
          const stmt = db.prepare(
            `INSERT INTO entries (session_id, movement, set_number, weight, reps)
             VALUES (?, ?, ?, ?, ?)`
          );
          const batch = entries.map((en) =>
            stmt.bind(
              sessionId,
              en.movement,
              en.set_number ?? null,
              en.weight ?? null,
              en.reps ?? null
            )
          );
          await db.batch(batch);
        }

        return json({ id: sessionId }, 201);
      }
    }

    // /api/sessions/:id
    if (parts[0] === "sessions" && parts.length === 2) {
      const id = parts[1];

      if (method === "GET") {
        const session = await db
          .prepare(`SELECT * FROM sessions WHERE id = ?`)
          .bind(id)
          .first();
        if (!session) return json({ error: "Session not found" }, 404);

        const { results } = await db
          .prepare(
            `SELECT movement, set_number, weight, reps
             FROM entries WHERE session_id = ? ORDER BY id`
          )
          .bind(id)
          .all();
        return json({ session, entries: results });
      }

      if (method === "DELETE") {
        await db.prepare(`DELETE FROM entries WHERE session_id = ?`).bind(id).run();
        await db.prepare(`DELETE FROM sessions WHERE id = ?`).bind(id).run();
        return json({ ok: true });
      }
    }

    // GET /api/last?movements=DB Bench Press,Dips
    if (parts[0] === "last" && method === "GET") {
      const movementsParam = url.searchParams.get("movements") || "";
      const movements = movementsParam
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

      const out = {};
      for (const m of movements) {
        // Pull all sets from the most recent session that included this movement.
        const { results } = await db
          .prepare(
            `SELECT e.set_number, e.weight, e.reps, s.date
             FROM entries e
             JOIN sessions s ON s.id = e.session_id
             WHERE e.movement = ?
               AND e.session_id = (
                 SELECT e2.session_id
                 FROM entries e2
                 JOIN sessions s2 ON s2.id = e2.session_id
                 WHERE e2.movement = ?
                 ORDER BY s2.date DESC, s2.id DESC
                 LIMIT 1
               )
             ORDER BY e.set_number`
          )
          .bind(m, m)
          .all();
        if (results.length) out[m] = results;
      }
      return json({ last: out });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ error: String((err && err.message) || err) }, 500);
  }
}
