<script>
  import { onMount, tick, untrack } from 'svelte';
  import NextDepartureBanner from '../lib/components/NextDepartureBanner.svelte';
  import GateBadge from '../lib/components/GateBadge.svelte';
  import AfterHoursBadge from '../lib/components/AfterHoursBadge.svelte';
  import MethodologyBox from '../lib/components/MethodologyBox.svelte';
  import {
    formatTime, isAfterHours, nowHHMM, nextDepartureIndex,
    depTime, depVariant, depId,
  } from '../lib/utils/timeUtils.js';
  import { lookupGate, getRouteRules } from '../lib/utils/gateLogic.js';
  import schedules from '../lib/data/schedules.json';

  const { navigate, routeId, dayType: initialDayType } = $props();

  let dayType = $state(untrack(() => initialDayType || 'weekday'));
  let currentTime = $state(nowHHMM());
  /** @type {HTMLElement[]} */
  let rowElements = $state([]);

  // Route data — supports both GTFS format (departure_time/route_short_name)
  // and legacy stub format (time/variant) via the depTime/depVariant helpers.
  const routeData = $derived(schedules[routeId]);
  const departures = $derived(routeData?.[dayType] ?? []);

  // Enrich each departure with gate, floor, and after-hours flag.
  // Adds normalized `time` and `variant` fields so sub-components that
  // pre-date the GTFS format change don't need updating.
  const enriched = $derived(
    departures.map(/** @param {Record<string,string>} dep */ dep => {
      const time    = depTime(dep);    // "HH:MM" — works for both formats
      const variant = depVariant(dep); // "126L", "163T", etc.
      const rule    = lookupGate(routeId, time, variant);
      return {
        ...dep,
        time,                          // normalized alias used by banner + detail
        variant,                       // normalized alias
        _id: depId(dep),               // URL-safe trip/dep ID for routing
        gate:       rule?.gate  ?? null,
        floor:      rule?.floor ?? null,
        afterHours: isAfterHours(time),
      };
    })
  );

  // Index of next departure
  const nextIdx = $derived(
    nextDepartureIndex(enriched.map(/** @param {{ time: string }} d */ d => d.time), currentTime)
  );

  // Data for the sticky banner
  const nextDeparture = $derived(nextIdx >= 0 ? enriched[nextIdx] : null);

  // All gate rules for this route (shown in empty state)
  const allRules = $derived(getRouteRules(routeId) ?? []);

  // Index of the first after-hours departure (10 PM divider)
  const afterHoursDividerIdx = $derived(
    enriched.findIndex(/** @param {{ afterHours: boolean }} d */ d => d.afterHours)
  );

  // Refresh current time every 30 seconds
  let interval;
  onMount(() => {
    interval = setInterval(() => { currentTime = nowHHMM(); }, 30_000);
    return () => clearInterval(interval);
  });

  // Auto-scroll next departure into view after render
  $effect(() => {
    const el = rowElements[nextIdx];
    if (nextIdx >= 0 && el) {
      tick().then(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
  });

  /** @param {'weekday'|'weekend'} type */
  function handleDayToggle(type) {
    dayType = type;
    navigate(`/schedule/${routeId}/${type}`);
  }

  function goBack() { navigate('/'); }

  /** @param {{ _id: string }} dep */
  function goToDetail(dep) {
    navigate(`/departure/${routeId}/${dayType}/${dep._id}`);
  }
</script>

<!-- Sticky next-departure banner -->
<NextDepartureBanner departure={nextDeparture} />

<div class="page">
  <!-- Back nav -->
  <button class="back-btn btn btn-ghost" onclick={goBack} aria-label="Back to search">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 13L4 8L10 3" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Back to search
  </button>

  <!-- Route header -->
  <header class="route-header">
    <div class="route-header__num gate-num" aria-label="Route {routeId}">
      {routeId}
    </div>
    <div class="route-header__info">
      {#if routeData}
        <h1 class="route-header__name">{routeData.route_name ?? routeData.name}</h1>
        {#if routeData.destination}
          <p class="route-header__dest">→ {routeData.destination}</p>
        {/if}
      {:else}
        <h1 class="route-header__name">Route {routeId}</h1>
        <p class="route-header__dest route-header__dest--warn">
          Schedule data not available for this route. Gate rules are shown below.
        </p>
      {/if}
    </div>
  </header>

  <!-- Day type toggle -->
  <div class="day-toggle-row">
    <div class="toggle-group" role="radiogroup" aria-label="Service day">
      <button
        type="button"
        class="toggle-btn"
        class:active={dayType === 'weekday'}
        role="radio"
        aria-checked={dayType === 'weekday'}
        onclick={() => handleDayToggle('weekday')}
      >Weekday</button>
      <button
        type="button"
        class="toggle-btn"
        class:active={dayType === 'weekend'}
        role="radio"
        aria-checked={dayType === 'weekend'}
        onclick={() => handleDayToggle('weekend')}
      >Weekend</button>
    </div>
    <span class="departure-count" aria-live="polite">
      {departures.length} departure{departures.length !== 1 ? 's' : ''}
    </span>
  </div>

  <!-- Schedule table -->
  {#if enriched.length === 0}
    <div class="empty-state card">
      <p>No {dayType} schedule data for route {routeId} yet.</p>
      <p class="empty-state__sub">Gate assignment rules are still available below.</p>
    </div>

    {#if allRules.length > 0}
      <section class="rules-section" aria-labelledby="rules-heading-sl">
        <h2 id="rules-heading-sl" class="rules-heading">Gate assignments for Route {routeId}</h2>
        <p class="rules-subhead">Gates change at approximately 10 PM and 1 AM.</p>
        <div class="rules-table card">
          <div class="rules-table__header" role="row">
            <span role="columnheader">Time window</span>
            <span role="columnheader">Variant</span>
            <span role="columnheader">Gate</span>
            <span role="columnheader">Floor</span>
          </div>
          {#each allRules as rule}
            <div class="rules-table__row" role="row">
              <span class="rules-row__window time-num" role="cell">{formatTime(rule.start)} – {formatTime(rule.end)}</span>
              <span class="rules-row__variant" role="cell">{rule.variant}</span>
              <span class="rules-row__gate gate-num" role="cell">{rule.gate}</span>
              <span role="cell"><GateBadge gate={rule.gate} floor={rule.floor} size="sm" /></span>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {:else}
    <!-- Column headers -->
    <div class="schedule-header" role="row" aria-label="Schedule column headers">
      <span role="columnheader">Time</span>
      <span role="columnheader">Route</span>
      <span role="columnheader">Gate</span>
      <span role="columnheader"><span class="sr-only">Flags</span></span>
    </div>

    <div class="schedule-list card" role="table" aria-label="Departure schedule for route {routeId}">
      {#each enriched as dep, i}
        <!-- After-hours divider before the first after-hours departure -->
        {#if i === afterHoursDividerIdx && afterHoursDividerIdx > 0}
          <div class="divider-afterhours" role="separator" aria-label="Gate change at 10 PM">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1.5L14 13H2L8 1.5Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
              <path d="M8 6v4M8 11.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Gate changes at 10 PM
          </div>
        {/if}

        <!-- Departure row -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          class="schedule-row"
          class:after-hours={dep.afterHours}
          class:is-next={i === nextIdx}
          role="row"
          tabindex="0"
          aria-label="{formatTime(dep.time)} {dep.variant}, gate {dep.gate ?? 'N/A'}"
          onclick={() => goToDetail(dep)}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && goToDetail(dep)}
          bind:this={rowElements[i]}
        >
          <!-- Time -->
          <span class="row-time time-num" role="cell">
            {formatTime(dep.time)}
          </span>

          <!-- Route/variant -->
          <span class="row-variant" role="cell">
            <span class="row-variant__tag">{dep.variant}</span>
            {#if i === nextIdx}
              <span class="next-tag" aria-label="Next departure">NOW</span>
            {/if}
          </span>

          <!-- Gate badge -->
          <span role="cell" class="row-gate">
            {#if dep.gate}
              <GateBadge gate={dep.gate} floor={dep.floor} size="sm" />
            {:else}
              <span class="row-no-gate">—</span>
            {/if}
          </span>

          <!-- Flags -->
          <span role="cell" class="row-flags">
            {#if dep.afterHours}
              <AfterHoursBadge compact={true} />
            {/if}
            <svg class="row-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
      {/each}
    </div>
  {/if}

  <MethodologyBox />
</div>

<style>
  .back-btn {
    margin-bottom: 1.25rem;
    font-size: 0.875rem;
    padding: 0.5rem 0.875rem;
    min-height: 2.5rem;
    align-self: flex-start;
  }

  .route-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .route-header__num {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-navy);
    line-height: 1;
    background: var(--color-floor2-bg);
    color: var(--color-floor2-text);
    border: 2px solid var(--color-floor2-text);
    border-radius: var(--radius-lg);
    padding: 0.25rem 0.75rem;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .route-header__info {
    flex: 1;
    min-width: 0;
  }

  .route-header__name {
    font-family: var(--font-sans);
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--color-navy-dark);
    margin: 0 0 0.25rem;
    line-height: 1.2;
  }

  .route-header__dest {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .route-header__dest--warn {
    color: var(--color-warning-text);
    font-style: italic;
  }

  .day-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.875rem;
    flex-wrap: wrap;
  }

  .departure-count {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }

  /* Schedule header row */
  .schedule-header {
    display: grid;
    grid-template-columns: 5.5rem 1fr auto auto;
    gap: 0.75rem;
    padding: 0.375rem 1rem 0.375rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    margin-bottom: 0.125rem;
  }

  /* Schedule list container */
  .schedule-list {
    overflow: hidden;
    padding: 0;
  }

  /* Row cells */
  .row-time {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
  }

  .row-variant {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    overflow: hidden;
  }

  .row-variant__tag {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
    font-family: var(--font-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .next-tag {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-next);
    background: var(--color-next-bg);
    border: 1px solid var(--color-next-border);
    border-radius: var(--radius-full);
    padding: 0.1em 0.45em;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .row-gate {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .row-no-gate {
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }

  .row-flags {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.35rem;
  }

  .row-chevron {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .empty-state {
    padding: 2rem 1.5rem;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .empty-state p { margin: 0 0 0.5rem; }
  .empty-state__sub { font-size: 0.875rem; color: var(--color-text-muted); }

  /* Gate rules table (shown in empty state) */
  .rules-section { margin-bottom: 1.5rem; }

  .rules-heading {
    font-family: var(--font-sans);
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-navy-dark);
    margin: 0 0 0.25rem;
  }

  .rules-subhead {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    margin: 0 0 0.875rem;
  }

  .rules-table { overflow: hidden; padding: 0; }

  .rules-table__header {
    display: grid;
    grid-template-columns: 10rem 1fr 5rem 6rem;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 0.67rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    background: var(--color-surface-subtle);
    border-bottom: 1px solid var(--color-border);
  }

  .rules-table__row {
    display: grid;
    grid-template-columns: 10rem 1fr 5rem 6rem;
    gap: 0.5rem;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .rules-table__row:last-child { border-bottom: none; }

  .rules-row__window {
    font-size: 0.8125rem;
    color: var(--color-text);
    white-space: nowrap;
  }

  .rules-row__gate {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-navy-dark);
  }

  @media (max-width: 480px) {
    .rules-table__header,
    .rules-table__row {
      grid-template-columns: 8.5rem 1fr auto;
    }
    .rules-table__header span:last-child,
    .rules-table__row span:nth-child(3) {
      display: none;
    }
  }
</style>
