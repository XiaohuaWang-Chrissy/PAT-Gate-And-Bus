import gates from '../data/gates.json';
import { timeInWindow } from './timeUtils.js';

/**
 * Find all gate rules that apply to a given route.
 * @param {string} routeId
 * @returns {Array|null}
 */
export function getRouteRules(routeId) {
  return gates[routeId] ?? null;
}

/**
 * Get all unique route IDs that have gate data.
 * @returns {string[]}
 */
export function getKnownRoutes() {
  return Object.keys(gates).filter(k => !k.startsWith('_'));
}

/**
 * Look up the gate assignment for a specific departure.
 *
 * Matching priority:
 * 1. Time window must match
 * 2. If multiple rules match, prefer the one whose variant string
 *    contains the departure variant (e.g., "126L only" matches "126L")
 * 3. Fall back to a rule with variant "All trips"
 *
 * @param {string} routeId       - e.g. "126"
 * @param {string} departureTime - "HH:MM" 24h
 * @param {string} variant       - e.g. "126L" or "126"
 * @returns {{ gate: string, floor: string, variant: string, start: string, end: string }|null}
 */
export function lookupGate(routeId, departureTime, variant) {
  const rules = gates[routeId];
  if (!rules) return null;

  // Filter rules whose time window covers this departure
  const candidates = rules.filter(r => timeInWindow(departureTime, r.start, r.end));
  if (candidates.length === 0) return null;

  // Only one candidate? Return it.
  if (candidates.length === 1) return candidates[0];

  // Multiple candidates: find the best variant match.
  // A rule is a "specific" match if its variant text is not "All trips".
  const variantUpper = variant.toUpperCase();

  const specific = candidates.find(r => {
    const rv = r.variant.toUpperCase();
    // "126L trips only" should match variant "126L" but NOT plain "126"
    // "Except 126L trips" should NOT match variant "126L"
    if (rv.includes('EXCEPT') || rv.includes('ALL TRIPS')) return false;
    // Require the variant to appear as a whole token (not just substring)
    // so "126" doesn't accidentally match "126L trips only"
    const tokens = rv.split(/[\s,/]+/);
    return tokens.some(t => t === variantUpper);
  });

  if (specific) return specific;

  // Check for "except" rule: if this departure variant appears in an "except" rule's exclude list,
  // that rule does NOT apply — skip it and look for the non-except alternative.
  // Find a rule that covers this variant without excluding it.
  const nonExcluded = candidates.find(r => {
    const rv = r.variant.toUpperCase();
    if (rv.includes('EXCEPT')) {
      // Check if our variant is the excluded one
      return !rv.includes(variantUpper);
    }
    return true; // "All trips" or generic
  });

  return nonExcluded ?? candidates[0];
}

/**
 * Derive a floor label from a gate number string.
 * Used as fallback when floor isn't explicit.
 * @param {string} gate
 * @returns {string}
 */
export function floorFromGate(gate) {
  const num = parseInt(gate);
  if (isNaN(num)) return '';
  if (num < 100)  return 'Lower Level';
  if (num < 300)  return '2nd floor';
  if (num < 400)  return '3rd floor';
  return '4th floor';
}

/**
 * Short floor label for display (badge).
 * @param {string} floor - full floor string from JSON
 * @returns {string}
 */
export function shortFloor(floor) {
  if (!floor) return '';
  if (floor.toLowerCase().includes('lower')) return 'Lower';
  if (floor.includes('4th')) return '4th fl.';
  if (floor.includes('3rd')) return '3rd fl.';
  if (floor.includes('2nd')) return '2nd fl.';
  return floor;
}
