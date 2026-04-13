<script>
  import GateBadge from '../lib/components/GateBadge.svelte';
  import AfterHoursBadge from '../lib/components/AfterHoursBadge.svelte';
  import MethodologyBox from '../lib/components/MethodologyBox.svelte';
  import {
    formatTime, isAfterHours,
    depTime, depVariant, decodeDepartureId,
  } from '../lib/utils/timeUtils.js';
  import { lookupGate, getRouteRules } from '../lib/utils/gateLogic.js';
  import schedules from '../lib/data/schedules.json';

  const { navigate, routeId, dayType, departureId } = $props();

  // departureId is URL-encoded; decode before matching against trip_id or id
  const decodedId = $derived(decodeDepartureId(departureId));

  const routeData  = $derived(schedules[routeId]);
  const departures = $derived(routeData?.[dayType] ?? []);

  // Match against both GTFS (trip_id) and legacy stub (id) formats
  const departure = $derived(
    departures.find(/** @param {Record<string,string>} d */ d =>
      (d.trip_id ?? d.id) === decodedId
    )
  );

  // Normalize time and variant once, reuse everywhere
  const depTimeHHMM = $derived(departure ? depTime(departure)    : '');
  const depVar      = $derived(departure ? depVariant(departure) : '');

  const gateRule  = $derived(departure ? lookupGate(routeId, depTimeHHMM, depVar) : null);
  const afterHours = $derived(departure ? isAfterHours(depTimeHHMM) : false);
  const allRules   = $derived(getRouteRules(routeId) ?? []);

  function goBack() {
    navigate(`/schedule/${routeId}/${dayType}`);
  }

  // NJ Transit ticketing link
  const ticketingUrl = 'https://www.njtransit.com/ticketing';
</script>

<div class="page">
  <!-- Back nav -->
  <button class="back-btn btn btn-ghost" onclick={goBack} aria-label="Back to schedule">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 13L4 8L10 3" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Schedule for {routeId}
  </button>

  {#if !departure}
    <div class="not-found card">
      <h1>Departure not found</h1>
      <p>This departure doesn't exist in our schedule data.</p>
      <button class="btn btn-primary" onclick={goBack}>Go back</button>
    </div>
  {:else}
    <!-- Gate hero -->
    <div class="hero card" class:hero--afterhours={afterHours}>
      {#if afterHours}
        <div class="hero__warning">
          <AfterHoursBadge />
          <span class="hero__warning-text">Gate differs from daytime assignment</span>
        </div>
      {/if}

      <div class="hero__body">
        <div class="hero__left">
          <div class="hero__label">Departure</div>
          <div class="hero__time time-num">{formatTime(depTimeHHMM)}</div>
          <div class="hero__route">
            <span class="hero__routeid gate-num">{depVar}</span>
            {#if routeData?.destination}
              <span class="hero__dest">→ {routeData.destination}</span>
            {:else if routeData?.route_name}
              <span class="hero__dest">→ {routeData.route_name}</span>
            {/if}
          </div>
          <div class="hero__day-tag">
            {dayType === 'weekday' ? 'Weekday' : 'Weekend'} service
          </div>
        </div>

        <div class="hero__gate-block" aria-label="Gate assignment">
          {#if gateRule}
            <div class="hero__gate-label">Gate</div>
            <div class="hero__gate-num gate-num" aria-label="Gate {gateRule.gate.split(' ')[0]}">
              {gateRule.gate.split(' ')[0]}
            </div>
            <GateBadge gate={gateRule.gate} floor={gateRule.floor} size="lg" />
            <div class="hero__window">
              Valid {formatTime(gateRule.start)} – {formatTime(gateRule.end)}
            </div>
          {:else}
            <div class="hero__gate-label">Gate</div>
            <div class="hero__gate-num hero__gate-num--unknown">N/A</div>
            <p class="hero__no-gate">No gate data for this departure. Check terminal signage.</p>
          {/if}
        </div>
      </div>
    </div>

    <!-- All gate rules for route -->
    <section class="rules-section" aria-labelledby="rules-heading">
      <h2 id="rules-heading" class="rules-heading">
        All gate rules for Route {routeId}
      </h2>
      <p class="rules-subhead">
        Gates change at approximately 10 PM and 1 AM. The highlighted row is the active rule for this departure.
      </p>

      <div class="rules-table card">
        <div class="rules-table__header" role="row">
          <span role="columnheader">Time window</span>
          <span role="columnheader">Variant</span>
          <span role="columnheader">Gate</span>
          <span role="columnheader">Floor</span>
        </div>

        {#each allRules as rule}
          {@const isActive = gateRule && rule.gate === gateRule.gate && rule.start === gateRule.start && rule.variant === gateRule.variant}
          <div
            class="rules-table__row"
            class:rules-table__row--active={isActive}
            role="row"
            aria-current={isActive ? 'true' : undefined}
          >
            <span class="rules-row__window time-num" role="cell">
              {formatTime(rule.start)} – {formatTime(rule.end)}
            </span>
            <span class="rules-row__variant" role="cell">{rule.variant}</span>
            <span class="rules-row__gate gate-num" role="cell">{rule.gate}</span>
            <span role="cell">
              <GateBadge gate={rule.gate} floor={rule.floor} size="sm" />
            </span>
          </div>
        {/each}
      </div>
    </section>

    <!-- Actions -->
    <div class="actions">
      <a
        href={ticketingUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary"
        aria-label="Buy NJ Transit tickets (opens njtransit.com in new tab)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.5" y="4.5" width="13" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="4" cy="8" r="1" fill="currentColor"/>
          <circle cx="12" cy="8" r="1" fill="currentColor"/>
          <path d="M6 8h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Buy tickets on NJ Transit
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 12L12 4M12 4H7M12 4V9" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>

      <button class="btn btn-ghost" onclick={goBack}>
        ← Back to {routeId} schedule
      </button>
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
  }

  /* Gate hero */
  .hero {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .hero--afterhours {
    border-color: var(--color-warning-border);
    background: var(--color-warning-bg);
  }

  .hero__warning {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin-bottom: 1.125rem;
    padding-bottom: 0.875rem;
    border-bottom: 1px solid var(--color-warning-border);
  }

  .hero__warning-text {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-warning);
  }

  .hero__body {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 380px) {
    .hero__body { grid-template-columns: 1fr; }
  }

  .hero__label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    margin-bottom: 0.25rem;
  }

  .hero__time {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-navy-dark);
    line-height: 1.1;
    margin-bottom: 0.375rem;
  }

  .hero__route {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
    flex-wrap: wrap;
  }

  .hero__routeid {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-navy);
    background: var(--color-floor2-bg);
    color: var(--color-floor2-text);
    border-radius: var(--radius-md);
    padding: 0.1em 0.45em;
  }

  .hero__dest {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .hero__day-tag {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  /* Gate block (right column) */
  .hero__gate-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    padding: 1rem 1.25rem;
    min-width: 8rem;
  }

  .hero__gate-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text-muted);
  }

  .hero__gate-num {
    font-size: 3rem;
    font-weight: 700;
    color: var(--color-navy-dark);
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .hero__gate-num--unknown {
    font-size: 1.5rem;
    color: var(--color-text-muted);
  }

  .hero__window {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .hero__no-gate {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    text-align: center;
    margin: 0;
  }

  /* Rules table */
  .rules-section {
    margin-bottom: 1.5rem;
  }

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
    line-height: 1.5;
  }

  .rules-table {
    overflow: hidden;
    padding: 0;
  }

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
    transition: background var(--ease-fast);
  }

  .rules-table__row:last-child {
    border-bottom: none;
  }

  .rules-table__row--active {
    background: var(--color-next-bg);
    border-left: 3px solid var(--color-next);
  }

  .rules-row__window {
    font-size: 0.8125rem;
    color: var(--color-text);
    white-space: nowrap;
  }

  .rules-row__variant {
    font-size: 0.8125rem;
    line-height: 1.4;
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

  /* Actions */
  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  @media (min-width: 480px) {
    .actions {
      flex-direction: row;
    }
  }

  .actions .btn { flex: 1; justify-content: center; }

  /* Not found */
  .not-found {
    padding: 2rem 1.5rem;
    text-align: center;
  }

  .not-found h1 {
    font-size: 1.25rem;
    color: var(--color-navy-dark);
    margin: 0 0 0.5rem;
    font-family: var(--font-sans);
    font-weight: 700;
  }
</style>
