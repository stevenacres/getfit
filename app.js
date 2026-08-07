/* GetFit — client app.
   Talks to the Cloudflare Pages Functions API at /api/*, backed by D1. */

// ----------------------------- The regimen -----------------------------
const PLAN = {
  mon: { label: "Monday", focus: "Arms / Chest", moves: [
    { name: "DB Bench Press", key: true, target: "6–12 reps", info: "Lie back on the bench, dumbbells at chest, palms forward. Press straight up, then lower under control. Wrists stacked over elbows." },
    { name: "Dips", key: true, target: "As many, clean", info: "Arms straight on the bars. Lower until shoulders dip just below elbows, then press up. Lean forward for more chest." },
    { name: "EZ-Bar Curls", key: false, target: "10–12 reps", info: "Curl the bar toward your shoulders with elbows pinned to your sides, then lower slowly." },
    { name: "Goblet Squat", key: false, target: "12–15 reps", info: "One dumbbell at your chest. Squat with chest tall and knees over toes, then stand." },
    { name: "Hanging Knee Raises", key: false, target: "8–12 reps", info: "Hang from the bar, raise both knees to your chest, lower slowly. No swinging." },
    { name: "Inverted Rows", key: false, target: "8–12 reps", info: "Bar around waist height, body straight, pull your chest to the bar. Lower bar = harder." },
  ]},
  tue: { label: "Tuesday", focus: "Legs", moves: [
    { name: "Bulgarian Split Squats", key: true, target: "6–12 / leg", info: "Rear foot on the bench, hold dumbbells. Lower until the front thigh is parallel, then drive up." },
    { name: "DB Romanian Deadlift", key: true, target: "8–12 reps", info: "Hips back, slight knee bend. Lower the weights down your legs to a hamstring stretch, then stand tall." },
    { name: "Goblet Squat", key: false, target: "12–15 reps", info: "One dumbbell at your chest, slow on the way down, then stand." },
    { name: "Push-Ups", key: false, target: "As many, clean", info: "Hands wider than shoulders, body straight. Chest to floor, then press up." },
    { name: "Single-Arm DB Row", key: false, target: "8–12 / arm", info: "Knee and hand on the bench, row the dumbbell to your ribs, squeeze, lower." },
    { name: "V-Ups", key: false, target: "8–12 reps", info: "Lie flat, lift legs and torso together into a V, reach for your toes, lower." },
  ]},
  wed: { label: "Wednesday", focus: "Back", moves: [
    { name: "Pull-Ups", key: true, target: "6–12 reps", info: "Overhand grip. Drive elbows down to pull your chin over the bar, then lower fully. Band-assist if needed." },
    { name: "Single-Arm DB Row", key: true, target: "8–12 / arm", info: "Knee on bench, pull to your ribs, squeeze the shoulder blade, lower with control." },
    { name: "Back Extensions", key: false, target: "12–15 reps", info: "Hips on the bench edge, raise your torso to straight, squeeze, then lower." },
    { name: "DB Shoulder Press", key: false, target: "8–12 reps", info: "Dumbbells at shoulder height, press overhead, then lower to shoulders." },
    { name: "Glute Bridges", key: false, target: "15–20 reps", info: "On your back, knees bent. Drive hips up, squeeze glutes hard, then lower." },
    { name: "Russian Twists", key: false, target: "20–30 total", info: "Lean back, feet up, rotate side to side holding a dumbbell." },
  ]},
  thu: { label: "Thursday", focus: "Abs / Core", moves: [
    { name: "Incline DB Press", key: true, target: "8–12 reps", info: "Bench on an incline. Press the dumbbells up — targets upper chest and shoulders." },
    { name: "Chin-Ups", key: true, target: "6–12 reps", info: "Underhand-grip pull-up — more biceps. Band-assist if needed." },
    { name: "Hanging Knee Raises", key: false, target: "8–12 reps", info: "Hang and raise knees to chest, slow, no swinging." },
    { name: "Side Plank", key: false, target: "20–40s / side", info: "On one forearm, hips lifted, body straight. Hold, then switch sides." },
    { name: "Plank Shoulder Taps", key: false, target: "20–30 total", info: "High plank, tap hand to opposite shoulder, hips steady." },
    { name: "Walking Lunges", key: false, target: "10–12 / leg", info: "Step into a lunge, both knees about 90°, walk forward. Dumbbells optional." },
  ]},
  fri: { label: "Friday", focus: "Upper Body", moves: [
    { name: "Dips", key: true, target: "As many, clean", info: "Lower until shoulders dip below elbows, then press up. Lean forward for chest, upright for triceps." },
    { name: "Pull-Ups", key: true, target: "6–12 reps", info: "Overhand grip, chin over the bar, then lower fully. Band-assist or inverted rows if needed." },
    { name: "DB Bench Press", key: false, target: "8–12 reps", info: "Dumbbells at chest, press straight up, then lower under control." },
    { name: "EZ-Bar Curls", key: false, target: "10–12 reps", info: "Curl toward your shoulders, elbows tucked, then lower slowly." },
    { name: "Reverse Lunges", key: false, target: "10–12 / leg", info: "Step back into a lunge, both knees about 90°, drive up through the front heel." },
    { name: "Hanging Knee Raises", key: false, target: "8–12 reps", info: "Hang, raise knees to chest, controlled." },
  ]},
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri"];
const SETS_PER_MOVE = 3;

// ----------------------------- State -----------------------------
const state = {
  view: "workout",
  day: defaultDay(),
};

function defaultDay() {
  const js = new Date().getDay(); // 0 Sun .. 6 Sat
  return ["mon", "mon", "tue", "wed", "thu", "fri", "fri"][js]; // weekend -> nearest
}

// ----------------------------- API helper -----------------------------
async function api(path, options) {
  const res = await fetch("/api" + path, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let msg = "Request failed";
    try { msg = (await res.json()).error || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

// ----------------------------- Render: workout -----------------------------
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function renderWorkout() {
  const day = PLAN[state.day];
  const pills = DAY_ORDER.map(k =>
    `<button class="daypill ${k === state.day ? "is-active" : ""}" data-day="${k}">${PLAN[k].label.slice(0, 3)}</button>`
  ).join("");

  const moves = day.moves.map((m, i) => {
    const sets = Array.from({ length: SETS_PER_MOVE }, (_, s) => `
      <div class="set-row">
        <div class="snum">Set ${s + 1}</div>
        <input type="number" inputmode="decimal" placeholder="weight" data-move="${i}" data-set="${s + 1}" data-field="weight" />
        <input type="number" inputmode="numeric" placeholder="reps" data-move="${i}" data-set="${s + 1}" data-field="reps" />
      </div>`).join("");

    return `
      <section class="move ${m.key ? "key" : ""}">
        <div class="move-head">
          <span class="move-name">${esc(m.name)}</span>
          ${m.key ? '<span class="keytag">Key lift</span>' : ""}
          <span class="move-target">${esc(m.target)}</span>
        </div>
        <div class="move-info">${esc(m.info)}</div>
        <div class="move-last" data-last="${esc(m.name)}"></div>
        <div class="sets">${sets}</div>
      </section>`;
  }).join("");

  document.getElementById("view").innerHTML = `
    <div class="dayhead">
      <div class="weekday">${day.label}</div>
      <div class="focus">Focus: ${day.focus}</div>
    </div>
    <div class="daypicker">${pills}</div>
    <div class="recipe">
      <b>Run it:</b> warm up 1–2 min, start the 20-minute timer, then circuit through all six.
      Push the <b>key lifts</b> for 6–12 hard reps (rest 30–45s); keep the rest quick (10–20s).
      Log what you do and beat last ${day.label}.
    </div>
    ${moves}
    <div class="session-meta">
      <input type="number" inputmode="numeric" id="roundsInput" placeholder="Rounds" />
      <input type="text" id="notesInput" placeholder="Notes (optional)" />
    </div>`;

  loadLastNumbers();
}

async function loadLastNumbers() {
  const day = PLAN[state.day];
  const names = [...new Set(day.moves.map(m => m.name))];
  try {
    const { last } = await api("/last?movements=" + encodeURIComponent(names.join(",")));
    document.querySelectorAll("[data-last]").forEach(el => {
      const rows = last[el.getAttribute("data-last")];
      if (rows && rows.length) {
        const parts = rows.map(r => {
          const w = r.weight != null ? r.weight + "×" : "";
          return w + (r.reps != null ? r.reps : "–");
        });
        el.innerHTML = `<span class="lbl">Last:</span> ${parts.join("  ·  ")}`;
      }
    });
  } catch (_) {
    // No history yet or offline — leave the "last" lines blank.
  }
}

// ----------------------------- Save -----------------------------
async function saveWorkout() {
  const day = PLAN[state.day];
  const entries = [];
  document.querySelectorAll('.set-row').forEach(row => {
    const w = row.querySelector('[data-field="weight"]');
    const r = row.querySelector('[data-field="reps"]');
    const reps = r.value.trim();
    const weight = w.value.trim();
    if (reps === "" && weight === "") return; // skip empty sets
    const moveIndex = Number(r.getAttribute("data-move"));
    entries.push({
      movement: day.moves[moveIndex].name,
      set_number: Number(r.getAttribute("data-set")),
      weight: weight === "" ? null : Number(weight),
      reps: reps === "" ? null : Number(reps),
    });
  });

  if (!entries.length) {
    toast("Log at least one set first");
    return;
  }

  const payload = {
    date: new Date().toISOString().slice(0, 10),
    day_key: state.day,
    focus: day.focus,
    rounds: numOrNull(document.getElementById("roundsInput").value),
    notes: document.getElementById("notesInput").value.trim() || null,
    entries,
  };

  const btn = document.getElementById("saveBtn");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    await api("/sessions", { method: "POST", body: JSON.stringify(payload) });
    toast("Workout saved ✓");
    renderWorkout(); // reset inputs + refresh "last"
  } catch (err) {
    toast("Couldn't save: " + err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Save workout";
  }
}

function numOrNull(v) { v = String(v).trim(); return v === "" ? null : Number(v); }

// ----------------------------- History -----------------------------
async function renderHistory() {
  const view = document.getElementById("view");
  view.innerHTML = `<div class="empty">Loading your history…</div>`;
  try {
    const { sessions } = await api("/sessions");
    if (!sessions.length) {
      view.innerHTML = `<div class="empty">No workouts logged yet.<br>Head to the Workout tab and log your first session — it'll show up here.</div>`;
      return;
    }
    view.innerHTML = sessions.map(s => `
      <div class="hist-card" data-id="${s.id}">
        <div class="hist-top">
          <span class="hist-date">${fmtDate(s.date)}</span>
          <span class="hist-focus">${esc(s.focus || (PLAN[s.day_key] && PLAN[s.day_key].focus) || "")}</span>
          <span class="hist-sub">${s.entry_count} sets${s.rounds ? " · " + s.rounds + " rounds" : ""}</span>
        </div>
        <div class="hist-detail" data-detail="${s.id}"></div>
      </div>`).join("");
  } catch (err) {
    view.innerHTML = `<div class="empty">Couldn't load history.<br>${esc(err.message)}</div>`;
  }
}

async function toggleHistoryCard(card) {
  const id = card.getAttribute("data-id");
  const detail = card.querySelector("[data-detail]");
  const opening = !card.classList.contains("open");
  card.classList.toggle("open");
  if (opening && !detail.dataset.loaded) {
    try {
      const { session, entries } = await api("/sessions/" + id);
      const rows = entries.map(e => {
        const w = e.weight != null ? e.weight + "×" : "";
        const val = w + (e.reps != null ? e.reps : "–");
        return `<div class="row"><span class="mv">${esc(e.movement)} <small style="color:#9a9ab0">· set ${e.set_number ?? "–"}</small></span><span>${val}</span></div>`;
      }).join("");
      detail.innerHTML = (rows || `<div class="row">No sets recorded.</div>`) +
        (session.notes ? `<div class="row" style="color:#6d71a0;margin-top:6px">“${esc(session.notes)}”</div>` : "") +
        `<button class="hist-del" data-del="${id}">Delete this workout</button>`;
      detail.dataset.loaded = "1";
    } catch (err) {
      detail.innerHTML = `<div class="row">Couldn't load: ${esc(err.message)}</div>`;
    }
  }
}

async function deleteSession(id) {
  if (!confirm("Delete this workout permanently?")) return;
  try {
    await api("/sessions/" + id, { method: "DELETE" });
    toast("Deleted");
    renderHistory();
  } catch (err) {
    toast("Couldn't delete: " + err.message);
  }
}

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// ----------------------------- 20-minute timer -----------------------------
const timer = { total: 20 * 60, left: 20 * 60, running: false, handle: null };

function tickTimer() {
  timer.left = Math.max(0, timer.left - 1);
  paintTimer();
  if (timer.left === 0) {
    stopTimer();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    document.getElementById("timerTime").classList.add("done");
    toast("Time! Nice work.");
  }
}
function paintTimer() {
  const m = String(Math.floor(timer.left / 60)).padStart(2, "0");
  const s = String(timer.left % 60).padStart(2, "0");
  document.getElementById("timerTime").textContent = `${m}:${s}`;
}
function startTimer() {
  if (timer.running) return;
  timer.running = true;
  document.getElementById("timerToggle").textContent = "Pause";
  timer.handle = setInterval(tickTimer, 1000);
}
function stopTimer() {
  timer.running = false;
  document.getElementById("timerToggle").textContent = timer.left === timer.total ? "Start" : "Resume";
  clearInterval(timer.handle);
}
function resetTimer() {
  stopTimer();
  timer.left = timer.total;
  document.getElementById("timerTime").classList.remove("done");
  document.getElementById("timerToggle").textContent = "Start";
  paintTimer();
}

// ----------------------------- Toast -----------------------------
let toastHandle;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastHandle);
  toastHandle = setTimeout(() => (el.hidden = true), 2200);
}

// ----------------------------- View switching -----------------------------
function setView(v) {
  state.view = v;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("is-active", t.dataset.view === v));
  document.getElementById("actionbar").hidden = v !== "workout";
  if (v === "workout") renderWorkout();
  else renderHistory();
}

// ----------------------------- Events -----------------------------
document.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) return setView(tab.dataset.view);

  const pill = e.target.closest(".daypill");
  if (pill) { state.day = pill.dataset.day; renderWorkout(); return; }

  const del = e.target.closest("[data-del]");
  if (del) { e.stopPropagation(); return deleteSession(del.getAttribute("data-del")); }

  const card = e.target.closest(".hist-card");
  if (card) return toggleHistoryCard(card);
});

document.getElementById("saveBtn").addEventListener("click", saveWorkout);
document.getElementById("timerToggle").addEventListener("click", () => (timer.running ? stopTimer() : startTimer()));
document.getElementById("timerReset").addEventListener("click", resetTimer);

// ----------------------------- Boot -----------------------------
setView("workout");
