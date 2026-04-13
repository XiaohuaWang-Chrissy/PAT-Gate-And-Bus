<script>
  /**
   * AfterHoursBadge: visual warning for departures outside normal hours.
   * Shown when departure time is after 22:00 or before 06:00.
   */
  const { compact = false } = $props();
</script>

<span
  class="ah-badge"
  class:ah-badge--compact={compact}
  title="After-hours departure — gate may differ from daytime assignment"
  role="img"
  aria-label="After-hours departure"
>
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M8 1.5L14 13H2L8 1.5Z"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linejoin="round"
      fill="none"
    />
    <path d="M8 6v4M8 11.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
  {#if !compact}
    <span>After hours</span>
  {/if}
</span>

<style>
  .ah-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    padding: 0.2em 0.55em;
    border-radius: var(--radius-full);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-warning);
    background: var(--color-warning-bg);
    border: 1px solid var(--color-warning-border);
    white-space: nowrap;
  }

  .ah-badge--compact {
    padding: 0.15em 0.35em;
  }

  svg {
    flex-shrink: 0;
  }
</style>
