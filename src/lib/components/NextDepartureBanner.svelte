<script>
  import GateBadge from './GateBadge.svelte';
  import AfterHoursBadge from './AfterHoursBadge.svelte';
  import { formatTime } from '../utils/timeUtils.js';

  /**
   * NextDepartureBanner: sticky top banner showing the upcoming departure.
   * departure: { time, variant, gate, floor, afterHours } | null
   */
  const { departure } = $props();
</script>

{#if departure}
  <div class="banner" role="status" aria-live="polite" aria-label="Next departure information">
    <div class="banner__inner">
      <div class="banner__label">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M8 4.5V8.5L10.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Next departure
      </div>

      <div class="banner__main">
        <span class="banner__time time-num">{formatTime(departure.time)}</span>
        <span class="banner__variant">{departure.variant}</span>
        {#if departure.afterHours}
          <AfterHoursBadge compact={true} />
        {/if}
      </div>

      <div class="banner__gate">
        {#if departure.gate}
          <GateBadge gate={departure.gate} floor={departure.floor} size="sm" />
        {:else}
          <span class="banner__no-gate">Gate N/A</span>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .banner {
    position: sticky;
    top: 0;
    z-index: 40;
    background: var(--color-next-bg);
    border-bottom: 2px solid var(--color-next-border);
    padding: 0.625rem 1rem;
  }

  .banner__inner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 46rem;
    margin-inline: auto;
    flex-wrap: wrap;
  }

  .banner__label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-next);
    white-space: nowrap;
  }

  .banner__main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .banner__time {
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--color-next);
    white-space: nowrap;
  }

  .banner__variant {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
  }

  .banner__gate {
    margin-left: auto;
    white-space: nowrap;
  }

  .banner__no-gate {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
  }
</style>
