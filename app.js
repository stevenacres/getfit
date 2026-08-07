/* GetFit — client app.
   Talks to the Cloudflare Pages Functions API at /api/*, backed by D1.

   Built on the DailyRepsGuy blueprint:
     1. One movement from each body part (Arms/Chest, Legs, Abs, Back), drawn
        from whatever PHASE you're in for that body part.
     2. Plus 1–2 extra movements for the day's focus  ->  6 movements total.
     3. 20-minute timer, circuit as many rounds as you can, 10–45s rest.
     4. Move up a phase when the movements get easy.

   You can be a different phase per body part — that's straight from the PDF
   ("You might be Phase 3 for legs but Phase 1 for back"). Set yours in Settings.

   The week's workouts are randomized from the library below and stay fixed for
   the whole week, so Tuesday looks the same whether you check it Monday night
   or Tuesday morning. A new week rolls a new set. You can also re-roll a single
   day, or swap any one movement for another from the same body part + phase. */

// ----------------------------- Body parts -----------------------------
const CATEGORIES = {
  arms_chest: "Arms / Chest",
  legs:       "Legs",
  abs:        "Abs / Core",
  back:       "Back",
};
const CAT_ORDER = ["arms_chest", "legs", "abs", "back"];

// Equipment on hand. `station` = the pull-up / dip station (also does inverted rows).
const EQUIPMENT = {
  dumbbell:   "Dumbbells",
  ezbar:      "EZ curl bar",
  bench:      "Bench",
  station:    "Pull-up / dip station",
  kettlebell: "Kettlebells",
};

const PHASE_NAMES = { 1: "Beginner", 2: "Intermediate", 3: "Advanced", 4: "Pro" };

// The training week. focus = the body part that gets the 2 extra movements.
// focus: null on Friday = full body, extras come from two random body parts.
const WEEK = {
  mon: { label: "Monday",    focus: "arms_chest" },
  tue: { label: "Tuesday",   focus: "legs" },
  wed: { label: "Wednesday", focus: "abs" },
  thu: { label: "Thursday",  focus: "back" },
  fri: { label: "Friday",    focus: null },
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri"];

const SETS_PER_MOVE = 3;
const EXTRA_MOVES = 2; // focus movements on top of the 4 base ones

// ----------------------------- Movement library -----------------------------
// Transcribed from the DailyRepsGuy PDF, adapted to the equipment on hand
// (backpack/chair substitutes swapped for dumbbells, bench and the station).
// Phase 4 (Pro) isn't a separate list — per the PDF it's Phase 3 with weight added.
const LIBRARY = {
  arms_chest: {
    1: [
      { name: "Kneeling Push-Ups", target: "8–15 reps", info: "Knees down, body straight from knees to head. Chest to the floor, then press up." },
      { name: "Bench Dips", target: "8–15 reps", info: "Hands on the bench edge behind you, feet out front. Lower until elbows hit 90°, then press up.", equip: ["bench"] },
      { name: "DB Bicep Curls", target: "10–12 reps", info: "Elbows pinned to your sides. Curl the dumbbells to your shoulders, lower slowly.", equip: ["dumbbell"] },
      { name: "Incline Push-Ups", target: "10–15 reps", info: "Hands on the bench, feet on the floor. Higher hands = easier. Chest to the bench, press up.", equip: ["bench"] },
    ],
    2: [
      { name: "Standard Push-Ups", target: "As many, clean", info: "Hands wider than shoulders, body straight. Chest to the floor, then press up." },
      { name: "Close-Grip Push-Ups", target: "8–15 reps", info: "Hands under your shoulders, elbows brushing your ribs. Triceps do the work." },
      { name: "DB Floor Press", target: "8–12 reps", info: "On your back on the floor, dumbbells at chest. Press up, let your triceps touch down between reps.", equip: ["dumbbell"] },
      { name: "Decline Push-Ups", target: "8–15 reps", info: "Feet up on the bench, hands on the floor. Hits the upper chest and shoulders.", equip: ["bench"] },
      { name: "Feet-Elevated Dips", target: "8–15 reps", info: "Hands on the bench behind you, heels up on something level with it. Lower to 90°, press up.", equip: ["bench"] },
      { name: "Diamond Push-Ups", target: "6–12 reps", info: "Hands together under your chest making a diamond. Elbows tight, press up." },
      { name: "Pike Push-Ups", target: "8–12 reps", info: "Hips high in an upside-down V. Lower the crown of your head toward the floor, press up." },
      { name: "DB Shoulder Press", target: "8–12 reps", info: "Dumbbells at shoulder height, press overhead until your arms lock, lower to shoulders.", equip: ["dumbbell"] },
      { name: "Chin-Ups", target: "6–12 reps", info: "Underhand grip, hands shoulder width. Pull your chin over the bar, lower all the way down.", equip: ["station"] },
      { name: "DB Bench Press", target: "6–12 reps", info: "Lie back on the bench, dumbbells at chest, palms forward. Press straight up, lower under control.", equip: ["dumbbell", "bench"] },
      { name: "EZ-Bar Curls", target: "10–12 reps", info: "Curl the bar toward your shoulders with elbows pinned to your sides, then lower slowly.", equip: ["ezbar"] },
      { name: "KB Floor Press", target: "8–12 reps", info: "On your back, bells at chest. Press up, let the triceps touch down between reps.", equip: ["kettlebell"] },
      { name: "KB Shoulder Press", target: "8–12 reps", info: "Bells racked at your shoulders. Press overhead, lower under control.", equip: ["kettlebell"] },
    ],
    3: [
      { name: "Explosive Push-Ups", target: "5–10 reps", info: "Push hard enough that your hands leave the floor. Land soft with bent elbows. Clap if you can." },
      { name: "Archer Push-Ups", target: "5–8 / side", info: "Wide hands. Shift your weight over one arm and straighten the other, then alternate." },
      { name: "DB Push-Up Rows", target: "6–10 / arm", info: "Push-up on the dumbbells, then row one to your ribs. Alternate arms, keep your hips square.", equip: ["dumbbell"] },
      { name: "Bodyweight Dips", target: "As many, clean", info: "Arms straight on the dip bars. Lower until shoulders dip just below elbows, press up. Lean forward for chest.", equip: ["station"] },
      { name: "Deficit Push-Ups", target: "8–12 reps", info: "Hands on the dumbbells so your chest sinks below them. Bigger stretch at the bottom.", equip: ["dumbbell"] },
      { name: "KB Clean to Press", target: "6–10 / arm", info: "Clean the bell to the rack position, then press overhead. Reset each rep.", equip: ["kettlebell"] },
      { name: "Handstand Push-Ups", target: "3–8 reps", info: "Kick up against a wall. Lower until your head lightly touches, then press back up." },
      { name: "Tension Push-Ups", target: "5–8 reps", info: "Hold the bottom 5–30s, or lower for 4–8s and drive up fast. Time under tension is the point." },
      { name: "Incline DB Press", target: "8–12 reps", info: "Bench on an incline. Press the dumbbells up — targets the upper chest.", equip: ["dumbbell", "bench"] },
      { name: "Weighted Dips", target: "5–10 reps", info: "Dips holding a dumbbell between your feet. Earn strict bodyweight reps before you add load.", equip: ["station", "dumbbell"] },
    ],
  },

  legs: {
    1: [
      { name: "Bodyweight Squats", target: "15–25 reps", info: "Feet shoulder width, chest tall. Sit down and back until your thighs are parallel, then stand." },
      { name: "Reverse Lunges", target: "10–12 / leg", info: "Step back into a lunge, both knees about 90°, drive up through the front heel." },
      { name: "Glute Bridges", target: "15–20 reps", info: "On your back, knees bent. Drive your hips up, squeeze your glutes hard, lower." },
      { name: "Step-Ups", target: "10–12 / leg", info: "Step up onto the bench with one foot, stand tall, step down under control.", equip: ["bench"] },
      { name: "Calf Raises", target: "20–30 reps", info: "Rise onto your toes as high as you can, pause at the top, lower slowly." },
    ],
    2: [
      { name: "Goblet Squat", target: "12–15 reps", info: "One dumbbell held at your chest. Squat with chest tall and knees tracking over your toes, then stand.", equip: ["dumbbell"] },
      { name: "Walking Lunges", target: "10–12 / leg", info: "Step into a lunge, both knees about 90°, walk forward. Dumbbells optional." },
      { name: "Single-Leg Glute Bridge", target: "10–15 / leg", info: "One foot planted, the other leg straight out. Drive the hips up, squeeze, lower." },
      { name: "Bulgarian Split Squats", target: "8–12 / leg", info: "Rear foot on the bench. Lower until the front thigh is parallel, then drive up.", equip: ["bench"] },
      { name: "Jump Squats", target: "10–15 reps", info: "Squat down, jump as high as you can, land soft and go straight into the next rep." },
      { name: "Jump Lunges", target: "8–12 / leg", info: "Lunge, jump and switch legs mid-air, land soft into the next lunge." },
      { name: "Kettlebell Swings", target: "15–25 reps", info: "Hinge at the hips and snap them forward to float the bell to chest height. Hips do the work, not arms.", equip: ["kettlebell"] },
    ],
    3: [
      { name: "Pistol Squat Progressions", target: "5–8 / leg", info: "Box pistol → assisted → full. One leg out front, sit down under control, stand back up." },
      { name: "Heavy Kettlebell Swings", target: "20–30 reps", info: "Hips snap the bell up. Hard glute squeeze at the top, let it fall back into the hinge.", equip: ["kettlebell"] },
      { name: "Weighted Step-Ups", target: "8–12 / leg", info: "Step-ups holding dumbbells. Drive through the heel of the top foot, control the way down.", equip: ["dumbbell", "bench"] },
      { name: "DB Romanian Deadlifts", target: "8–12 reps", info: "Hips back, slight knee bend. Lower the weights down your legs to a hamstring stretch, then stand tall.", equip: ["dumbbell"] },
      { name: "Static Lunge KB Pass-Through", target: "8–12 / leg", info: "Hold the bottom of a lunge and pass the bell under your front thigh each rep.", equip: ["kettlebell"] },
      { name: "Weighted Glute Bridges", target: "12–20 reps", info: "Glute bridge with a dumbbell across your hips. Squeeze hard at the top.", equip: ["dumbbell"] },
      { name: "KB Overhead Squats", target: "6–10 / arm", info: "Bell locked out overhead, eyes on it. Squat deep keeping that arm vertical.", equip: ["kettlebell"] },
      { name: "Weighted Bulgarian Split Squats", target: "8–12 / leg", info: "Rear foot on the bench, dumbbells in hand. Lower until the front thigh is parallel, drive up.", equip: ["dumbbell", "bench"] },
    ],
  },

  abs: {
    1: [
      { name: "Dead Bugs", target: "10–15 / side", info: "On your back, arms up, knees at 90°. Lower the opposite arm and leg, keep your low back flat." },
      { name: "Crunches", target: "15–25 reps", info: "Hands light behind your head. Curl your shoulders off the floor, squeeze, lower." },
      { name: "Leg Raises", target: "10–15 reps", info: "Flat on your back, legs straight. Raise to vertical, lower slowly without touching down." },
      { name: "Plank", target: "20–30s", info: "Forearms down, body in one straight line. Squeeze glutes and abs, don't let your hips sag." },
      { name: "Penguins", target: "20–30 total", info: "Crunched up on your back, reach side to side tapping your heels." },
    ],
    2: [
      { name: "V-Ups", target: "8–12 reps", info: "Lie flat, lift legs and torso together into a V, reach for your toes, lower." },
      { name: "Hanging Knee Raises", target: "8–12 reps", info: "Hang from the bar, raise both knees to your chest, lower slowly. No swinging.", equip: ["station"] },
      { name: "Side Planks", target: "30–40s / side", info: "On one forearm, hips lifted, body straight. Hold, then switch sides." },
      { name: "Russian Twists", target: "20–30 total", info: "Lean back, feet up, rotate side to side. Hold a dumbbell to make it harder." },
      { name: "Kettlebell Marches", target: "20–30 total", info: "Bell racked or overhead. March in place, driving each knee to hip height.", equip: ["kettlebell"] },
      { name: "Plank Shoulder Taps", target: "20–30 total", info: "High plank, tap hand to opposite shoulder, keep your hips dead still." },
      { name: "Mountain Climbers", target: "30–50 total", info: "High plank, drive your knees to your chest fast, hips low and steady." },
    ],
    3: [
      { name: "Hanging Leg Raises", target: "8–12 reps", info: "Hang with straight legs, raise them to the bar, lower slowly. No swing.", equip: ["station"] },
      { name: "Toes-to-Bar Progressions", target: "6–10 reps", info: "Knee raise → L-raise → toes touching the bar. Work whichever one you own.", equip: ["station"] },
      { name: "Plank Walk-Outs", target: "8–12 reps", info: "From standing, walk your hands out to a plank, hold a beat, walk back." },
      { name: "KB Sit-Up to Press", target: "10–15 reps", info: "Sit-up holding the bell at your chest, press it overhead at the top.", equip: ["kettlebell"] },
      { name: "KB Overhead Marches", target: "20–30 total", info: "Bell locked out overhead, march in place. Ribs down, don't lean.", equip: ["kettlebell"] },
      { name: "Long Planks", target: "60–120s", info: "Hold past a minute. Add slow hip dips side to side if it gets easy." },
    ],
  },

  back: {
    1: [
      { name: "Supermans", target: "12–20 reps", info: "Face down, lift chest, arms and legs off the floor. Squeeze, lower." },
      { name: "DB Bent-Over Rows", target: "10–15 reps", info: "Hinge forward, back flat. Row the dumbbells to your ribs, squeeze, lower.", equip: ["dumbbell"] },
      { name: "Reverse Snow Angels", target: "12–20 reps", info: "Face down, sweep your arms from your hips to overhead staying off the floor the whole time." },
      { name: "Doorway Isometric Pulls", target: "20–40s", info: "Grip a sturdy frame, lean back and pull hard against it. Hold the tension." },
      { name: "Band-Assisted Pull-Ups", target: "6–12 reps", info: "Band under your feet or knee. Chin over the bar, lower all the way down.", equip: ["station"] },
    ],
    2: [
      { name: "Single-Arm DB Row", target: "8–12 / arm", info: "Knee and hand on the bench, row the dumbbell to your ribs, squeeze the shoulder blade, lower.", equip: ["dumbbell", "bench"] },
      { name: "Good Mornings", target: "12–15 reps", info: "Hands behind your head, hinge at the hips with a flat back, then stand tall." },
      { name: "Back Extensions", target: "12–15 reps", info: "Hips on the bench edge, raise your torso to straight, squeeze, then lower.", equip: ["bench"] },
      { name: "Pull-Ups", target: "6–12 reps", info: "Overhand grip. Drive your elbows down to pull your chin over the bar, then lower fully.", equip: ["station"] },
      { name: "Chin-Ups", target: "6–12 reps", info: "Underhand grip — more biceps. Chin over the bar, full lower.", equip: ["station"] },
      { name: "Inverted Rows", target: "8–12 reps", info: "Bar around waist height, body straight, pull your chest to the bar. Lower bar = harder.", equip: ["station"] },
      { name: "Single-Arm KB Row", target: "8–12 / arm", info: "Knee and hand on the bench, row the bell to your ribs, squeeze, lower.", equip: ["kettlebell", "bench"] },
    ],
    3: [
      { name: "Renegade Rows", target: "6–10 / arm", info: "Plank on the dumbbells. Row one to your ribs without letting your hips rotate.", equip: ["dumbbell"] },
      { name: "KB Gorilla Rows", target: "8–12 / arm", info: "Bells on the floor between your feet, hinge over, row one at a time.", equip: ["kettlebell"] },
      { name: "Explosive Hip Hinges", target: "12–20 reps", info: "Hinge and snap the hips hard — the bell floats up on hip drive alone.", equip: ["kettlebell"] },
      { name: "Weighted Supermans", target: "12–20 reps", info: "Superman holding a light dumbbell overhead. Lift chest and legs, squeeze.", equip: ["dumbbell"] },
      { name: "KB Clean and Press", target: "6–10 / arm", info: "Clean the bell to the rack, press overhead, return under control.", equip: ["kettlebell"] },
      { name: "Weighted Pull-Ups", target: "5–10 reps", info: "Pull-ups with a dumbbell held between your feet. Strict reps only.", equip: ["station", "dumbbell"] },
      { name: "Feet-Elevated Inverted Rows", target: "8–12 reps", info: "Feet up on the bench, body straight and horizontal. Pull your chest to the bar.", equip: ["station", "bench"] },
      { name: "EZ-Bar Bent-Over Rows", target: "8–12 reps", info: "Hinge forward with a flat back. Row the bar to your belly, squeeze, lower.", equip: ["ezbar"] },
    ],
  },
};

// ----------------------------- Settings (localStorage) -----------------------------
const LS_SETTINGS = "getfit.settings.v1";
const LS_WEEK = "getfit.week.v1";

const DEFAULT_SETTINGS = {
  phases: { arms_chest: 2, legs: 2, abs: 2, back: 2 },
  equipment: { dumbbell: true, ezbar: true, bench: true, station: true, kettlebell: false },
};

let settings = loadSettings();

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_SETTINGS) || "null");
    if (!raw) return structuredCloneish(DEFAULT_SETTINGS);
    return {
      phases: { ...DEFAULT_SETTINGS.phases, ...(raw.phases || {}) },
      equipment: { ...DEFAULT_SETTINGS.equipment, ...(raw.equipment || {}) },
    };
  } catch (_) {
    return structuredCloneish(DEFAULT_SETTINGS);
  }
}
function saveSettings() {
  try { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); } catch (_) {}
}
function structuredCloneish(o) { return JSON.parse(JSON.stringify(o)); }

// ----------------------------- Dates + seeding -----------------------------
function isoDate(d) {
  // Local date, not UTC — logging at 11pm should record today, not tomorrow.
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}
function todayISO() { return isoDate(new Date()); }

function weekStartISO(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mondayOffset = (x.getDay() + 6) % 7; // Mon = 0 ... Sun = 6
  x.setDate(x.getDate() - mondayOffset);
  return isoDate(x);
}

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
// Small deterministic PRNG so a given week+day always builds the same workout.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----------------------------- Week overrides (localStorage) -----------------------------
// { weekStart, days: { mon: { bump, swaps: { "0": "Push-Ups" } } } }
function loadWeek() {
  const current = weekStartISO();
  let wd;
  try { wd = JSON.parse(localStorage.getItem(LS_WEEK) || "null"); } catch (_) { wd = null; }
  if (!wd || wd.weekStart !== current) wd = { weekStart: current, days: {} };
  if (!wd.days) wd.days = {};
  return wd;
}
function saveWeek(wd) {
  try { localStorage.setItem(LS_WEEK, JSON.stringify(wd)); } catch (_) {}
}
function dayOverride(wd, dayKey) {
  if (!wd.days[dayKey]) wd.days[dayKey] = { bump: 0, swaps: {} };
  if (!wd.days[dayKey].swaps) wd.days[dayKey].swaps = {};
  return wd.days[dayKey];
}

// ----------------------------- Workout generation -----------------------------
function poolPhase(phase) { return phase === 4 ? 3 : phase; } // Phase 4 = Phase 3 + load

function availableMoves(cat, phase) {
  const pool = LIBRARY[cat][poolPhase(phase)] || [];
  return pool.filter(m => (m.equip || []).every(e => settings.equipment[e]));
}

function pickOne(pool, rng, used) {
  const free = pool.filter(m => !used.has(m.name));
  if (!free.length) return null;
  const m = free[Math.floor(rng() * free.length)];
  used.add(m.name);
  return m;
}

/* Returns [{ cat, move, focus }] — 4 base movements (one per body part) plus
   EXTRA_MOVES focus movements, per the blueprint. */
function buildDay(dayKey) {
  const wd = loadWeek();
  const ov = dayOverride(wd, dayKey);
  const rng = mulberry32(hashStr(wd.weekStart + "|" + dayKey + "|" + (ov.bump || 0)));
  const used = new Set();
  const slots = [];

  for (const cat of CAT_ORDER) {
    const move = pickOne(availableMoves(cat, settings.phases[cat]), rng, used);
    if (move) slots.push({ cat, move, focus: false });
  }

  const focusCat = WEEK[dayKey].focus;
  for (let i = 0; i < EXTRA_MOVES; i++) {
    const cat = focusCat || CAT_ORDER[Math.floor(rng() * CAT_ORDER.length)];
    const move = pickOne(availableMoves(cat, settings.phases[cat]), rng, used);
    if (move) slots.push({ cat, move, focus: true });
  }

  // Apply any manual single-movement swaps for this day.
  slots.forEach((slot, i) => {
    const swapped = ov.swaps[i];
    if (!swapped) return;
    const found = availableMoves(slot.cat, settings.phases[slot.cat]).find(m => m.name === swapped);
    if (found) slot.move = found;
  });

  return slots;
}

let currentSlots = [];

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

function dayFocusLabel(dayKey) {
  const f = WEEK[dayKey].focus;
  return f ? CATEGORIES[f] : "Full body";
}

/* Grab whatever's typed in so a swap or re-roll doesn't wipe the other cards.
   Keyed by movement name, so it survives movements moving around. */
function captureInputs() {
  const vals = { sets: {}, rounds: "", notes: "" };
  document.querySelectorAll(".set-row input").forEach(inp => {
    const mv = inp.getAttribute("data-mv");
    if (!mv || inp.value.trim() === "") return;
    vals.sets[mv + "|" + inp.getAttribute("data-set") + "|" + inp.getAttribute("data-field")] = inp.value;
  });
  const r = document.getElementById("roundsInput");
  const n = document.getElementById("notesInput");
  if (r) vals.rounds = r.value;
  if (n) vals.notes = n.value;
  return vals;
}
function restoreInputs(vals) {
  if (!vals) return;
  document.querySelectorAll(".set-row input").forEach(inp => {
    const mv = inp.getAttribute("data-mv");
    if (!mv) return;
    const k = mv + "|" + inp.getAttribute("data-set") + "|" + inp.getAttribute("data-field");
    if (vals.sets[k] != null) inp.value = vals.sets[k];
  });
  const r = document.getElementById("roundsInput");
  const n = document.getElementById("notesInput");
  if (r && vals.rounds) r.value = vals.rounds;
  if (n && vals.notes) n.value = vals.notes;
}

function renderWorkout(keepInputs) {
  const carried = keepInputs ? captureInputs() : null;
  const dayKey = state.day;
  currentSlots = buildDay(dayKey);

  const pills = DAY_ORDER.map(k =>
    `<button class="daypill ${k === dayKey ? "is-active" : ""}" data-day="${k}">${WEEK[k].label.slice(0, 3)}</button>`
  ).join("");

  const moves = currentSlots.map((slot, i) => {
    const m = slot.move;
    const phase = settings.phases[slot.cat];
    const sets = Array.from({ length: SETS_PER_MOVE }, (_, s) => `
      <div class="set-row">
        <div class="snum">${s + 1}</div>
        <input type="number" inputmode="decimal" placeholder="weight" data-mv="${esc(m.name)}" data-set="${s + 1}" data-field="weight" />
        <input type="number" inputmode="numeric" placeholder="reps" data-mv="${esc(m.name)}" data-set="${s + 1}" data-field="reps" />
      </div>`).join("");

    return `
      <section class="move ${slot.focus ? "is-focus" : ""}" style="animation-delay:${i * 55}ms">
        <div class="move-top">
          <h3 class="move-name">${esc(m.name)}</h3>
          <button class="move-swap" data-swap="${i}" title="Swap for another ${esc(CATEGORIES[slot.cat])} movement" aria-label="Swap ${esc(m.name)}">⟳</button>
        </div>
        <div class="move-tags">
          ${slot.focus ? '<span class="tag tag-focus">Focus set</span>' : ""}
          <span class="tag tag-target">${esc(m.target)}</span>
          <span class="tag">${esc(CATEGORIES[slot.cat])} · P${phase}</span>
          ${phase === 4 ? '<span class="tag tag-pro">Add weight</span>' : ""}
        </div>
        <p class="move-info">${esc(m.info)}</p>
        <div class="move-last" data-last="${esc(m.name)}"></div>
        <div class="sets">${sets}</div>
      </section>`;
  }).join("");

  const empty = currentSlots.length === 0
    ? `<div class="banner">No movements match your current equipment and phases. Open <b>Settings</b> and turn some equipment on, or drop a phase.</div>`
    : "";

  document.getElementById("view").innerHTML = `
    <section class="hero">
      <div class="hero-eyebrow">${esc(WEEK[dayKey].label)} · ${currentSlots.length} movements</div>
      <h1 class="hero-title">${esc(dayFocusLabel(dayKey))}</h1>
      <div class="hero-focus">20 minutes</div>
      <div class="daypicker">${pills}</div>
    </section>

    <div class="brief">
      <p>
        Warm up 1–2 min, start the timer, then circuit through all ${currentSlots.length}.
        Push the <b>focus sets</b> hard — rest 30–45s. Keep the rest quick, 10–20s.
        Beat last time.
      </p>
      <button class="btn" id="rerollBtn"><span class="ico">⟳</span> Re-roll this day</button>
    </div>

    ${empty}
    <div class="moves">${moves}</div>

    <div class="session-meta">
      <input type="number" inputmode="numeric" id="roundsInput" placeholder="Rounds completed" />
      <input type="text" id="notesInput" placeholder="Notes (optional)" />
    </div>`;

  restoreInputs(carried);
  loadLastNumbers();
}

async function loadLastNumbers() {
  const names = [...new Set(currentSlots.map(s => s.move.name))];
  if (!names.length) return;
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

// ----------------------------- Swap + re-roll -----------------------------
function swapMove(index) {
  const slot = currentSlots[index];
  if (!slot) return;
  const phase = settings.phases[slot.cat];
  const inUse = new Set(currentSlots.map(s => s.move.name));
  const alts = availableMoves(slot.cat, phase).filter(m => !inUse.has(m.name));

  if (!alts.length) {
    toast(`No other ${CATEGORIES[slot.cat]} moves at Phase ${phase}`);
    return;
  }

  const next = alts[Math.floor(Math.random() * alts.length)];
  const wd = loadWeek();
  dayOverride(wd, state.day).swaps[index] = next.name;
  saveWeek(wd);
  renderWorkout(true);
  toast("Swapped in " + next.name);
}

function rerollDay() {
  const wd = loadWeek();
  const ov = dayOverride(wd, state.day);
  ov.bump = (ov.bump || 0) + 1;
  ov.swaps = {};
  saveWeek(wd);
  renderWorkout(true);
  toast("New workout rolled");
}

// ----------------------------- Save -----------------------------
async function saveWorkout() {
  const byName = new Map(currentSlots.map(s => [s.move.name, s]));
  const entries = [];

  document.querySelectorAll(".set-row").forEach(row => {
    const w = row.querySelector('[data-field="weight"]');
    const r = row.querySelector('[data-field="reps"]');
    const reps = r.value.trim();
    const weight = w.value.trim();
    if (reps === "" && weight === "") return; // skip empty sets
    const movement = r.getAttribute("data-mv");
    if (!byName.has(movement)) return;
    entries.push({
      movement,
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
    date: todayISO(),
    day_key: state.day,
    focus: dayFocusLabel(state.day),
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

// ----------------------------- Render: settings -----------------------------
function renderSettings() {
  const cats = CAT_ORDER.map(cat => {
    const cur = settings.phases[cat];
    const pills = [1, 2, 3, 4].map(p =>
      `<button class="phasepill ${p === cur ? "is-active" : ""}" data-phase-cat="${cat}" data-phase="${p}">${p}</button>`
    ).join("");
    return `
      <div class="setrow">
        <div>
          <div class="setrow-name">${esc(CATEGORIES[cat])}</div>
          <div class="setrow-sub">${PHASE_NAMES[cur]} · ${availableMoves(cat, cur).length} movements in the pool</div>
        </div>
        <div class="phasepills">${pills}</div>
      </div>`;
  }).join("");

  const equip = Object.keys(EQUIPMENT).map(k => {
    const n = CAT_ORDER.reduce((sum, c) =>
      sum + [1, 2, 3].reduce((s, p) =>
        s + (LIBRARY[c][p] || []).filter(m => (m.equip || []).includes(k)).length, 0), 0);
    return `
      <label class="equiprow">
        <input type="checkbox" data-equip="${k}" ${settings.equipment[k] ? "checked" : ""} />
        <span class="box" aria-hidden="true"></span>
        <span>${esc(EQUIPMENT[k])}</span>
        <span class="sub">${n} movement${n === 1 ? "" : "s"}</span>
      </label>`;
  }).join("");

  document.getElementById("view").innerHTML = `
    <section class="hero">
      <div class="hero-eyebrow">Configuration</div>
      <h1 class="hero-title">Settings</h1>
      <div class="hero-focus">Phases &amp; kit</div>
    </section>

    <div class="brief">
      <p>
        You can sit at a <b>different phase for each body part</b> — straight from the PDF.
        Move up when you can add 2 extra reps on your last set, two workouts running.
        Phase 4 draws from the Phase 3 pool and tells you to add load.
      </p>
    </div>

    <div class="section-label">Phase by body part</div>
    <div class="panel">${cats}</div>

    <div class="section-label">Equipment</div>
    <div class="panel">${equip}</div>

    <div class="brief" style="margin-top:22px">
      <p>Changing any of this re-rolls the movements you haven't already swapped by hand.</p>
      <button class="btn" id="rerollWeekBtn"><span class="ico">⟳</span> Re-roll the whole week</button>
    </div>`;
}

// ----------------------------- History -----------------------------
async function renderHistory() {
  const view = document.getElementById("view");
  view.innerHTML = `<div class="empty">Loading your history…</div>`;
  try {
    const { sessions } = await api("/sessions");
    const hero = `
      <section class="hero">
        <div class="hero-eyebrow">${sessions.length} session${sessions.length === 1 ? "" : "s"} logged</div>
        <h1 class="hero-title">History</h1>
        <div class="hero-focus">Every rep</div>
      </section>`;

    if (!sessions.length) {
      view.innerHTML = hero + `<div class="empty"><b>Nothing logged yet</b>Head to the Workout tab and log your first session — it'll show up here.</div>`;
      return;
    }
    view.innerHTML = hero + `<div class="hist-grid">` + sessions.map((s, i) => `
      <div class="hist-card" data-id="${s.id}" style="animation-delay:${Math.min(i, 12) * 45}ms">
        <div class="hist-top">
          <span class="hist-date">${fmtDate(s.date)}</span>
          <span class="hist-focus">${esc(s.focus || (WEEK[s.day_key] && dayFocusLabel(s.day_key)) || "")}</span>
          <span class="hist-sub">${s.entry_count} sets${s.rounds ? " · " + s.rounds + " rounds" : ""}</span>
        </div>
        <div class="hist-detail" data-detail="${s.id}"></div>
      </div>`).join("") + `</div>`;
  } catch (err) {
    view.innerHTML = `<div class="empty"><b>Couldn't load history</b>${esc(err.message)}</div>`;
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
        return `<div class="row"><span class="mv">${esc(e.movement)} <small>· set ${e.set_number ?? "–"}</small></span><span class="val">${val}</span></div>`;
      }).join("");
      detail.innerHTML = (rows || `<div class="row">No sets recorded.</div>`) +
        (session.notes ? `<div class="hist-note">“${esc(session.notes)}”</div>` : "") +
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

const RING_C = 2 * Math.PI * 21; // matches r=21 in the dock SVG

function tickTimer() {
  timer.left = Math.max(0, timer.left - 1);
  paintTimer();
  if (timer.left === 0) {
    stopTimer();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    document.getElementById("timerTime").classList.add("done");
    document.querySelector(".ring").classList.add("is-done");
    toast("Time! Nice work.");
  }
}
function paintTimer() {
  const m = String(Math.floor(timer.left / 60)).padStart(2, "0");
  const s = String(timer.left % 60).padStart(2, "0");
  document.getElementById("timerTime").textContent = `${m}:${s}`;
  // Ring depletes as the 20 minutes burn down.
  const ring = document.getElementById("timerRing");
  if (ring) ring.style.strokeDashoffset = String(RING_C * (1 - timer.left / timer.total));
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
  document.querySelector(".ring").classList.remove("is-done");
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
  else if (v === "settings") renderSettings();
  else renderHistory();
}

// ----------------------------- Events -----------------------------
document.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) return setView(tab.dataset.view);

  const pill = e.target.closest(".daypill");
  if (pill) { state.day = pill.dataset.day; renderWorkout(); return; }

  const swap = e.target.closest("[data-swap]");
  if (swap) return swapMove(Number(swap.getAttribute("data-swap")));

  if (e.target.closest("#rerollBtn")) return rerollDay();

  if (e.target.closest("#rerollWeekBtn")) {
    saveWeek({ weekStart: weekStartISO(), days: {} });
    toast("Whole week re-rolled");
    return;
  }

  const phase = e.target.closest("[data-phase]");
  if (phase) {
    settings.phases[phase.getAttribute("data-phase-cat")] = Number(phase.getAttribute("data-phase"));
    saveSettings();
    renderSettings();
    return;
  }

  const del = e.target.closest("[data-del]");
  if (del) { e.stopPropagation(); return deleteSession(del.getAttribute("data-del")); }

  const card = e.target.closest(".hist-card");
  if (card) return toggleHistoryCard(card);
});

document.addEventListener("change", (e) => {
  const eq = e.target.closest("[data-equip]");
  if (eq) {
    settings.equipment[eq.getAttribute("data-equip")] = eq.checked;
    saveSettings();
    renderSettings();
  }
});

document.getElementById("saveBtn").addEventListener("click", saveWorkout);
document.getElementById("timerToggle").addEventListener("click", () => (timer.running ? stopTimer() : startTimer()));
document.getElementById("timerReset").addEventListener("click", resetTimer);

// ----------------------------- Boot -----------------------------
paintTimer();
setView("workout");
