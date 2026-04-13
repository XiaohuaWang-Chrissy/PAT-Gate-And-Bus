<script>
  /**
   * GateBadge: displays gate number + floor in a color-coded pill.
   * Floor color follows the design token system defined in app.css.
   */
  const { gate, floor, size = 'md' } = $props();

  // Strip "door N" suffixes for the prominent display — keep only the gate number
  const gateNum = $derived(gate ? gate.split(' ')[0] : '—');

  // Floor → CSS class mapping
  const floorClass = $derived(() => {
    if (!floor) return 'floor-unknown';
    const f = floor.toLowerCase();
    if (f.includes('lower')) return 'floor-lower';
    if (f.includes('4th'))   return 'floor-4';
    if (f.includes('3rd'))   return 'floor-3';
    if (f.includes('2nd'))   return 'floor-2';
    return 'floor-unknown';
  });

  // Short floor label
  const floorLabel = $derived(() => {
    if (!floor) return '';
    const f = floor.toLowerCase();
    if (f.includes('lower')) return 'Lower';
    if (f.includes('4th'))   return '4th fl.';
    if (f.includes('3rd'))   return '3rd fl.';
    if (f.includes('2nd'))   return '2nd fl.';
    return floor;
  });
</script>

<span class="gate-badge gate-badge--{size} {floorClass()}" aria-label="Gate {gateNum}, {floorLabel()}">
  <span class="gate-badge__num gate-num">{gateNum}</span>
  {#if floorLabel()}
    <span class="gate-badge__floor">{floorLabel()}</span>
  {/if}
</span>

<style>
  .gate-badge {
    display: inline-flex;
    align-items: baseline;
    gap: 0.35em;
    padding: 0.2em 0.6em;
    border-radius: var(--radius-full);
    border: 1.5px solid currentColor;
    white-space: nowrap;
    line-height: 1;
    font-size: 0.875rem;
  }

  .gate-badge--lg {
    font-size: 1.125rem;
    padding: 0.3em 0.8em;
  }

  .gate-badge--sm {
    font-size: 0.75rem;
    padding: 0.15em 0.5em;
  }

  .gate-badge__num {
    font-size: 1.1em;
    font-weight: 700;
  }

  .gate-badge__floor {
    font-size: 0.75em;
    font-weight: 500;
    opacity: 0.85;
  }

  /* Floor-specific color themes */
  .floor-lower {
    color: var(--color-lower-text);
    background: var(--color-lower-bg);
    border-color: var(--color-lower-text);
  }

  .floor-2 {
    color: var(--color-floor2-text);
    background: var(--color-floor2-bg);
    border-color: var(--color-floor2-text);
  }

  .floor-3 {
    color: var(--color-floor3-text);
    background: var(--color-floor3-bg);
    border-color: var(--color-floor3-text);
  }

  .floor-4 {
    color: var(--color-floor4-text);
    background: var(--color-floor4-bg);
    border-color: var(--color-floor4-text);
  }

  .floor-unknown {
    color: var(--color-text-secondary);
    background: var(--color-surface-subtle);
    border-color: var(--color-border-strong);
  }
</style>
