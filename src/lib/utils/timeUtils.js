/**
 * Time utilities for PABT gate logic.
 *
 * Internal representation: "HH:MM" 24-hour strings (hours 00–23).
 * GTFS source format: "HH:MM:SS" where HH can exceed 23 for overnight trips.
 * Use normalizeGtfsTime() to convert GTFS times before passing to other fns.
 */

/**
 * Convert a GTFS departure_time string to "HH:MM" (internal format).
 * Handles hours ≥ 24 (e.g. "25:30:00" → "01:30" — overnight trips that
 * cross the service-day boundary).
 * Also accepts plain "HH:MM" input (from the stub schedules.json).
 * @param {string} gtfsTime - "HH:MM:SS" or "HH:MM"
 * @returns {string} "HH:MM"
 */
export function normalizeGtfsTime(gtfsTime) {
  if (!gtfsTime) return '00:00';
  const parts = gtfsTime.split(':');
  const h = parseInt(parts[0], 10) % 24;
  const m = parseInt(parts[1] ?? '0', 10);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Normalize a departure object's time field.
 * Accepts both new GTFS format (departure_time) and old stub format (time).
 * @param {{ departure_time?: string, time?: string }} dep
 * @returns {string} "HH:MM"
 */
export function depTime(dep) {
  return normalizeGtfsTime(dep.departure_time ?? dep.time ?? '');
}

/**
 * Get the variant string from a departure object.
 * Accepts both new GTFS format (route_short_name) and old stub format (variant).
 * @param {{ route_short_name?: string, variant?: string }} dep
 * @returns {string}
 */
export function depVariant(dep) {
  return dep.route_short_name ?? dep.variant ?? '';
}

/**
 * Get the stable ID string from a departure object, URL-encoded.
 * Accepts both new GTFS format (trip_id) and old stub format (id).
 * @param {{ trip_id?: string, id?: string }} dep
 * @returns {string}
 */
export function depId(dep) {
  return encodeURIComponent(dep.trip_id ?? dep.id ?? '');
}

/**
 * Decode a departure ID back from a URL param.
 * @param {string} encodedId
 * @returns {string}
 */
export function decodeDepartureId(encodedId) {
  try { return decodeURIComponent(encodedId); } catch { return encodedId; }
}

/**
 * Parse "HH:MM" to total minutes from midnight.
 * @param {string} time - "HH:MM"
 * @returns {number} minutes
 */
export function parseMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Check whether a time falls within a [start, end] window.
 * Handles windows that cross midnight (e.g., "22:01"–"01:00").
 * @param {string} time  - "HH:MM"
 * @param {string} start - "HH:MM"
 * @param {string} end   - "HH:MM"
 * @returns {boolean}
 */
export function timeInWindow(time, start, end) {
  const t = parseMinutes(time);
  const s = parseMinutes(start);
  const e = parseMinutes(end);

  if (s <= e) {
    // Normal window: no midnight crossing
    return t >= s && t <= e;
  } else {
    // Crosses midnight (e.g., 22:01–01:00)
    return t >= s || t <= e;
  }
}

/**
 * Returns true when a departure is in the "after-hours" period:
 * after 22:00 (10 PM) or before 06:00 (6 AM).
 * @param {string} time - "HH:MM"
 * @returns {boolean}
 */
export function isAfterHours(time) {
  const t = parseMinutes(time);
  return t >= parseMinutes('22:00') || t < parseMinutes('06:00');
}

/**
 * Format "HH:MM" to 12-hour display with AM/PM.
 * @param {string} time - "HH:MM"
 * @returns {string} e.g. "6:30 PM"
 */
export function formatTime(time) {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  const min = String(m).padStart(2, '0');
  return `${hour}:${min} ${period}`;
}

/**
 * Get the current time as "HH:MM".
 * @returns {string}
 */
export function nowHHMM() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Return today's day type based on local date.
 * @returns {'weekday'|'weekend'}
 */
export function todayDayType() {
  const day = new Date().getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6 ? 'weekend' : 'weekday';
}

/**
 * Compare two "HH:MM" strings accounting for overnight schedules.
 * Departures midnight–05:59 sort after 22:00+ departures.
 * @param {string} a - "HH:MM"
 * @param {string} b - "HH:MM"
 * @returns {number}
 */
export function compareTimes(a, b) {
  const wrap = (t) => {
    const m = parseMinutes(t);
    // Treat midnight–05:59 as occurring "after" late-night 22:00+
    return m < 360 ? m + 1440 : m;
  };
  return wrap(a) - wrap(b);
}

/**
 * Find the index of the next departure (first departure at or after now).
 * @param {string[]} times - sorted "HH:MM" array
 * @param {string} now - "HH:MM"
 * @returns {number} index, or -1 if none today
 */
export function nextDepartureIndex(times, now) {
  const nowMin = parseMinutes(now);
  // Find first time >= now (accounting for midnight wrap)
  for (let i = 0; i < times.length; i++) {
    const t = parseMinutes(times[i]);
    // After-midnight departures (00:00–05:59): only show as "next" if now is also after midnight
    const adjustedT = t < 360 ? t + 1440 : t;
    const adjustedNow = nowMin < 360 ? nowMin + 1440 : nowMin;
    if (adjustedT >= adjustedNow) return i;
  }
  return -1;
}
