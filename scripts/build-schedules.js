/**
 * build-schedules.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads NJ Transit GTFS-BUS static files from ./gtfs/ and writes
 * src/lib/data/schedules.json for the PABT Gate Finder app.
 *
 * Correctly handles all four common GTFS-join pitfalls:
 *   1. calendar.txt   — filters service_ids by day-of-week + start/end date
 *   2. calendar_dates.txt — applies added/removed service exceptions
 *   3. trips.txt join — every matching trip_id is carried through (no dedup)
 *   4. stops.txt      — finds ALL PABT stop_ids, not just one
 *
 * Usage:
 *   node scripts/build-schedules.js
 *   node scripts/build-schedules.js --date 2026-04-10
 *   node scripts/build-schedules.js --gtfs ./path/to/gtfs --out ./path/to/out.json
 *
 * Required files in ./gtfs/:
 *   routes.txt, trips.txt, stop_times.txt, stops.txt,
 *   calendar.txt, calendar_dates.txt
 *
 * Output format (schedules.json):
 * {
 *   "126": {
 *     "route_id": "126",
 *     "route_name": "126 - Mahwah",
 *     "weekday": [
 *       { "trip_id": "...", "departure_time": "06:12:00",
 *         "route_short_name": "126", "service_type": "weekday" }
 *     ],
 *     "weekend": [...]
 *   }
 * }
 *
 * Note: route_short_name is included in each departure so the app can display
 * route variants (126, 126L, 163T, etc.) in the schedule list.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// ─── Parse CLI args ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const GTFS_DIR    = resolve(getArg('--gtfs', './gtfs'));
const OUTPUT_PATH = resolve(getArg('--out',  './src/lib/data/schedules.json'));

// Target date: used to check start_date/end_date validity in calendar.txt
// and to apply calendar_dates.txt exceptions. Defaults to today.
const targetDateStr = getArg('--date', (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
})());

// Parse target date
const [tyear, tmonth, tday] = targetDateStr.split('-').map(Number);
const targetDate = new Date(tyear, tmonth - 1, tday);
const targetDow  = targetDate.getDay(); // 0=Sun, 1=Mon … 6=Sat

// Compact GTFS date string (YYYYMMDD) for comparisons
const targetGtfsDate = `${tyear}${String(tmonth).padStart(2,'0')}${String(tday).padStart(2,'0')}`;

// Day-of-week column names in calendar.txt (0-indexed from Sunday)
const DOW_COLS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

// ─── CSV parser ───────────────────────────────────────────────────────────────

/**
 * Splits a single CSV line respecting double-quoted fields.
 * @param {string} line
 * @returns {string[]}
 */
function splitCsvLine(line) {
  const result = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cell += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      result.push(cell); cell = '';
    } else {
      cell += ch;
    }
  }
  result.push(cell);
  return result;
}

/**
 * Parse a GTFS CSV file into an array of row objects.
 * @param {string} filePath
 * @returns {Record<string, string>[]}
 */
function readGtfs(filePath) {
  const text  = readFileSync(filePath, 'utf8');
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.at(-1)?.trim() === '') lines.pop();

  const headers = splitCsvLine(lines[0]).map(h => h.trim());

  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const vals = splitCsvLine(line);
      /** @type {Record<string, string>} */
      const row = {};
      headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim(); });
      return row;
    });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise a GTFS departure_time "HH:MM:SS" where HH can exceed 23.
 * Times ≥ 24:00:00 represent the following calendar day (overnight service).
 * Returns the original string but with raw hours kept for sorting.
 * The field `departure_time` in output keeps the original GTFS value.
 */
function normaliseGtfsTime(t) {
  // Pad to HH:MM:SS if needed
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? '0', 10);
  const s = parseInt(parts[2] ?? '0', 10);
  return {
    raw: t,                                          // original value for output
    sortKey: h * 3600 + m * 60 + s,                 // seconds-since-midnight for sorting
    displayTime: `${String(h % 24).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`,
  };
}

/**
 * Extract the numeric base of a route_short_name.
 * "126L" → "126", "163T" → "163", "190D" → "190", "319" → "319"
 * @param {string} s
 * @returns {string}
 */
function baseRouteNum(s) {
  return s.replace(/[A-Za-z]+$/, '').trim();
}

/**
 * GTFS date string "YYYYMMDD" comparator — returns negative/0/positive.
 * @param {string} a
 * @param {string} b
 */
function cmpDate(a, b) { return a.localeCompare(b); }

// ─── Validate inputs ──────────────────────────────────────────────────────────

const REQUIRED = ['stops.txt','routes.txt','trips.txt','stop_times.txt','calendar.txt'];
for (const f of REQUIRED) {
  const p = join(GTFS_DIR, f);
  if (!existsSync(p)) {
    console.error(`✗  Missing required GTFS file: ${p}`);
    console.error('   Place all GTFS files in ./gtfs/ and retry.');
    process.exit(1);
  }
}
const HAS_CAL_DATES = existsSync(join(GTFS_DIR, 'calendar_dates.txt'));

// ─── Start ────────────────────────────────────────────────────────────────────

console.log('\n━━━  PABT Schedule Builder  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`  GTFS dir    : ${GTFS_DIR}`);
console.log(`  Output file : ${OUTPUT_PATH}`);
console.log(`  Target date : ${targetDateStr} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][targetDow]})`);
console.log(`  GTFS date   : ${targetGtfsDate}`);
console.log(`  calendar_dates.txt: ${HAS_CAL_DATES ? 'found ✓' : 'NOT found — exceptions skipped'}`);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Find all PABT stop_ids
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Step 1: PABT stop_ids ─────────────────────────────────────────────\n');

const stopsRows = readGtfs(join(GTFS_DIR, 'stops.txt'));

const PABT_PATTERNS = [
  'port authority bus terminal',
  'port authority buster',   // typo variants sometimes appear
  'port authority bus',
  'port auth bus',
  'port authority',
  'pabt',
];

const pabtStops = stopsRows.filter(s => {
  const name = (s.stop_name ?? s.stop_desc ?? '').toLowerCase().trim();
  return PABT_PATTERNS.some(p => name.includes(p));
});

if (pabtStops.length === 0) {
  console.error('  ✗ No PABT stops found! Dumping first 40 stop names so you can identify the correct pattern:\n');
  stopsRows.slice(0, 40).forEach(s => console.log(`     ${s.stop_id.padEnd(10)} "${s.stop_name}"`));
  console.error('\n  → Update PABT_PATTERNS in build-schedules.js to match your feed and retry.');
  process.exit(1);
}

const pabtStopIds = new Set(pabtStops.map(s => s.stop_id));

console.log(`  Found ${pabtStopIds.size} PABT stop_id(s):\n`);
pabtStops.forEach(s => {
  console.log(`    stop_id: ${s.stop_id.padEnd(12)} stop_name: "${s.stop_name}"`);
});

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Build service_id classification (weekday / weekend)
//          using calendar.txt + calendar_dates.txt
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Step 2: Service calendar ──────────────────────────────────────────\n');

/**
 * PITFALL 1: calendar.txt filtering
 *
 * A service_id is "active" (eligible for this run) only if the target date
 * falls within its [start_date, end_date] window.
 *
 * Once active, we classify the service_id as 'weekday', 'weekend', or both
 * based on which day columns are set to '1'.
 */
const calRows = readGtfs(join(GTFS_DIR, 'calendar.txt'));

// service_id → Set<'weekday'|'weekend'>
/** @type {Map<string, Set<string>>} */
const serviceDayTypes = new Map();

for (const row of calRows) {
  const id        = row.service_id;
  const startDate = row.start_date;
  const endDate   = row.end_date;

  if (!id) continue;

  // Check date range
  if (cmpDate(targetGtfsDate, startDate) < 0) continue; // not started yet
  if (cmpDate(targetGtfsDate, endDate)   > 0) continue; // already expired

  const types = new Set();
  // Weekday = any of Mon–Fri
  if (['monday','tuesday','wednesday','thursday','friday'].some(d => row[d] === '1')) {
    types.add('weekday');
  }
  // Weekend = Sat or Sun
  if (row.saturday === '1' || row.sunday === '1') {
    types.add('weekend');
  }

  if (types.size > 0) serviceDayTypes.set(id, types);
}

console.log(`  calendar.txt — ${calRows.length} entries, ${serviceDayTypes.size} within date range`);

/**
 * PITFALL 2: calendar_dates.txt exceptions
 *
 * These can ADD a service_id on a specific date (exception_type=1)
 * or REMOVE it (exception_type=2).
 *
 * We apply exceptions for the target date:
 *   - type 1: ensure this service_id appears in serviceDayTypes, classified
 *             by the day-of-week of the exception date
 *   - type 2: if the target date falls on that exception, REMOVE the service_id
 *             from the day-type it would otherwise cover
 *
 * We also scan ALL calendar_dates entries (not just the target date) for
 * service_ids that ONLY appear in calendar_dates (no calendar.txt entry).
 * Those are classified by the day-of-week of their exception dates.
 */
if (HAS_CAL_DATES) {
  const cdRows = readGtfs(join(GTFS_DIR, 'calendar_dates.txt'));
  let added = 0, removed = 0, seenOnlyInCd = 0;

  for (const row of cdRows) {
    const id   = row.service_id;
    const date = row.date;
    const type = row.exception_type;
    if (!id || !date || !type) continue;

    // Determine day-of-week for this exception date
    const ey  = parseInt(date.slice(0,4), 10);
    const em  = parseInt(date.slice(4,6), 10) - 1;
    const ed  = parseInt(date.slice(6,8), 10);
    const edow = new Date(ey, em, ed).getDay();
    const exDayType = (edow === 0 || edow === 6) ? 'weekend' : 'weekday';

    if (type === '1') {
      // Service ADDED on this date.
      // ▸ For this specific date (target): add to serviceDayTypes.
      // ▸ For other dates: ensure service_id is known, classified by that day.
      if (!serviceDayTypes.has(id)) {
        serviceDayTypes.set(id, new Set());
        seenOnlyInCd++;
      }
      serviceDayTypes.get(id).add(exDayType);
      if (date === targetGtfsDate) added++;

    } else if (type === '2' && date === targetGtfsDate) {
      // Service REMOVED on the target date.
      // Remove from the relevant day-type bucket for target day only.
      const targetDayType = (targetDow === 0 || targetDow === 6) ? 'weekend' : 'weekday';
      if (serviceDayTypes.has(id)) {
        serviceDayTypes.get(id).delete(targetDayType);
        // If empty set, remove entirely
        if (serviceDayTypes.get(id).size === 0) serviceDayTypes.delete(id);
        removed++;
      }
    }
  }

  console.log(`  calendar_dates.txt — ${cdRows.length} rows`);
  console.log(`    Exceptions on ${targetDateStr}: ${added} added, ${removed} removed`);
  console.log(`    Service_ids only in calendar_dates: ${seenOnlyInCd}`);
}

const wdServices = [...serviceDayTypes.entries()].filter(([,v]) => v.has('weekday')).length;
const weServices = [...serviceDayTypes.entries()].filter(([,v]) => v.has('weekend')).length;
console.log(`  Total active service_ids: ${serviceDayTypes.size} (${wdServices} weekday, ${weServices} weekend)`);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Load routes.txt
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Step 3: Routes ────────────────────────────────────────────────────\n');

const routeRows = readGtfs(join(GTFS_DIR, 'routes.txt'));
// route_id → { shortName, longName }
/** @type {Map<string, { shortName: string, longName: string }>} */
const routeMeta = new Map();
for (const r of routeRows) {
  routeMeta.set(r.route_id, {
    shortName: r.route_short_name?.trim() ?? '',
    longName:  r.route_long_name?.trim()  ?? '',
  });
}
console.log(`  ${routeMeta.size} routes loaded from routes.txt`);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — Load trips.txt
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Step 4: Trips ─────────────────────────────────────────────────────\n');

const tripRows = readGtfs(join(GTFS_DIR, 'trips.txt'));
// trip_id → { routeId, serviceId, headsign }
/** @type {Map<string, { routeId: string, serviceId: string, headsign: string }>} */
const tripMeta = new Map();
for (const t of tripRows) {
  tripMeta.set(t.trip_id, {
    routeId:   t.route_id,
    serviceId: t.service_id,
    headsign:  t.trip_headsign?.trim() ?? '',
  });
}
console.log(`  ${tripMeta.size} trips loaded from trips.txt`);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 5 — Scan stop_times.txt for PABT departures
//
// PITFALL 3: we must NOT deduplicate or short-circuit — every trip_id that
// passes all filters contributes exactly one departure row.
//
// PITFALL 4: we check ALL pabtStopIds, not just one.
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Step 5: stop_times.txt scan (large file — may take a moment) ──────\n');

const stRaw     = readFileSync(join(GTFS_DIR, 'stop_times.txt'), 'utf8');
const stLines   = stRaw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
const stHeaders = splitCsvLine(stLines[0]).map(h => h.trim());

// Column indices — fail fast if expected columns are missing
const COL = {};
for (const col of ['trip_id','stop_id','departure_time','arrival_time','pickup_type','stop_sequence']) {
  COL[col] = stHeaders.indexOf(col);
}
if (COL.trip_id < 0 || COL.stop_id < 0) {
  console.error('  ✗ stop_times.txt missing required columns: trip_id, stop_id');
  process.exit(1);
}
if (COL.departure_time < 0 && COL.arrival_time < 0) {
  console.error('  ✗ stop_times.txt has neither departure_time nor arrival_time');
  process.exit(1);
}

/**
 * Each PABT boardable departure becomes one entry here.
 * @type {Array<{ tripId: string, departureTime: string, sortKey: number }>}
 */
const pabtEntries = [];
let rowsScanned = 0;
let skippedNoPickup = 0;

for (let i = 1; i < stLines.length; i++) {
  const line = stLines[i];
  if (!line.trim()) continue;
  rowsScanned++;

  const cols  = splitCsvLine(line);
  const stopId = cols[COL.stop_id]?.trim();

  // PITFALL 4: check against all PABT stop_ids
  if (!pabtStopIds.has(stopId)) continue;

  // pickup_type 1 = no boarding allowed — skip
  const pickupType = COL.pickup_type >= 0 ? cols[COL.pickup_type]?.trim() : '';
  if (pickupType === '1') { skippedNoPickup++; continue; }

  const tripId  = cols[COL.trip_id]?.trim();
  const rawTime = (COL.departure_time >= 0 ? cols[COL.departure_time]?.trim() : '') ||
                  (COL.arrival_time   >= 0 ? cols[COL.arrival_time]?.trim()   : '');

  if (!tripId || !rawTime) continue;

  const { sortKey, displayTime } = normaliseGtfsTime(rawTime);
  pabtEntries.push({ tripId, departureTime: rawTime, displayTime, sortKey });
}

console.log(`  Scanned       : ${rowsScanned.toLocaleString()} stop_time rows`);
console.log(`  PABT matches  : ${pabtEntries.length.toLocaleString()} boardable departures`);
console.log(`  Skipped (no pickup): ${skippedNoPickup.toLocaleString()}`);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 6 — Join: stop_times → trips → routes → calendar
//          and group into weekday / weekend buckets per route
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Step 6: Join and group ────────────────────────────────────────────\n');

/**
 * Output structure:
 *   routeBaseNum → {
 *     route_id:   string,
 *     route_name: string,
 *     weekday:    Array<DepartureRow>,
 *     weekend:    Array<DepartureRow>,
 *   }
 *
 * DepartureRow: { trip_id, departure_time, route_short_name, service_type }
 */
/** @type {Map<string, { route_id: string, route_name: string, weekday: any[], weekend: any[] }>} */
const output = new Map();

let skNoTrip    = 0;
let skNoRoute   = 0;
let skNoService = 0;
let insertedWD  = 0;
let insertedWE  = 0;

// PITFALL 3: iterate every entry — no deduplication per route
for (const { tripId, departureTime, displayTime, sortKey } of pabtEntries) {
  const trip = tripMeta.get(tripId);
  if (!trip) { skNoTrip++; continue; }

  const route = routeMeta.get(trip.routeId);
  if (!route) { skNoRoute++; continue; }

  const dayTypes = serviceDayTypes.get(trip.serviceId);
  if (!dayTypes || dayTypes.size === 0) { skNoService++; continue; }

  const shortName = route.shortName;  // e.g. "126L"
  const baseNum   = baseRouteNum(shortName) || shortName; // e.g. "126"

  // Initialise route bucket
  if (!output.has(baseNum)) {
    output.set(baseNum, {
      route_id:   baseNum,
      route_name: [shortName, route.longName].filter(Boolean).join(' - '),
      weekday:    [],
      weekend:    [],
    });
  }
  const bucket = output.get(baseNum);

  /** @type {{ trip_id: string, departure_time: string, route_short_name: string, service_type: string, _sort: number }} */
  const row = {
    trip_id:          tripId,
    departure_time:   departureTime,   // original GTFS value "HH:MM:SS"
    route_short_name: shortName,       // e.g. "126L" — used as variant in the UI
    service_type:     '',              // filled below
    _sort:            sortKey,         // removed before output
  };

  if (dayTypes.has('weekday')) {
    bucket.weekday.push({ ...row, service_type: 'weekday' });
    insertedWD++;
  }
  if (dayTypes.has('weekend')) {
    bucket.weekend.push({ ...row, service_type: 'weekend' });
    insertedWE++;
  }
}

console.log(`  Skipped — trip_id not in trips.txt   : ${skNoTrip}`);
console.log(`  Skipped — route_id not in routes.txt  : ${skNoRoute}`);
console.log(`  Skipped — service_id not in calendar  : ${skNoService}`);
console.log(`  Inserted weekday departures : ${insertedWD.toLocaleString()}`);
console.log(`  Inserted weekend departures : ${insertedWE.toLocaleString()}`);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 7 — Sort departures and build final JSON
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Step 7: Sort and write ────────────────────────────────────────────\n');

// Sort route keys numerically, then alpha for non-numeric routes
const sortedKeys = [...output.keys()].sort((a, b) => {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b);
});

/** @type {Record<string, object>} */
const jsonOutput = {
  _meta: {
    source:      'NJ Transit GTFS-BUS static feed',
    generated:   new Date().toISOString(),
    target_date: targetDateStr,
    note:        'Auto-generated by scripts/build-schedules.js — do not edit manually.',
  },
};

// Per-route summary table header
console.log('  Route  | WD deps | WE deps | Name');
console.log('  -------+---------+---------+----------------------------------------------');

let totalWD = 0, totalWE = 0;

for (const key of sortedKeys) {
  const bucket = output.get(key);

  // Sort within each day type by departure time (ascending).
  // Overnight trips (>= 1440 minutes) sort after midnight same-day entries.
  const sortFn = (a, b) => a._sort - b._sort;
  bucket.weekday.sort(sortFn);
  bucket.weekend.sort(sortFn);

  // Strip internal sort key before output
  const toRow = ({ _sort, ...rest }) => rest;
  const wdRows = bucket.weekday.map(toRow);
  const weRows = bucket.weekend.map(toRow);

  jsonOutput[key] = {
    route_id:   bucket.route_id,
    route_name: bucket.route_name,
    weekday:    wdRows,
    weekend:    weRows,
  };

  const wdLen = String(wdRows.length).padStart(7);
  const weLen = String(weRows.length).padStart(7);
  const name  = bucket.route_name.slice(0, 48);
  console.log(`  ${key.padEnd(6)} | ${wdLen} | ${weLen} | ${name}`);

  totalWD += wdRows.length;
  totalWE += weRows.length;
}

console.log('  -------+---------+---------+');
console.log(`  TOTAL  | ${String(totalWD).padStart(7)} | ${String(totalWE).padStart(7)} |`);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 8 — Write output
// ══════════════════════════════════════════════════════════════════════════════

const jsonStr = JSON.stringify(jsonOutput, null, 2);
writeFileSync(OUTPUT_PATH, jsonStr, 'utf8');

console.log(`\n  ✓ Wrote ${sortedKeys.length} routes → ${OUTPUT_PATH}`);
console.log(`    File size: ${(jsonStr.length / 1024).toFixed(1)} KB`);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
