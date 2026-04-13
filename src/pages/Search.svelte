<script>
  import DatabaseHeader from '../lib/components/DatabaseHeader.svelte';
  import MethodologyBox from '../lib/components/MethodologyBox.svelte';
  import { todayDayType } from '../lib/utils/timeUtils.js';
  import { getKnownRoutes } from '../lib/utils/gateLogic.js';

  const { navigate } = $props();

  // Known routes from gate data
  const knownRoutes = getKnownRoutes().sort((a, b) => Number(a) - Number(b));

  let routeInput = $state('');
  let dayType = $state(todayDayType());
  let error = $state('');

  /** @param {SubmitEvent} e */
  function handleSubmit(e) {
    e.preventDefault();
    const route = routeInput.trim().toUpperCase().replace(/^0+/, ''); // strip leading zeros
    if (!route) {
      error = 'Please enter a route number.';
      return;
    }
    if (!knownRoutes.includes(route)) {
      error = `Route ${route} is not in our gate database. Try: ${knownRoutes.slice(0, 5).join(', ')}…`;
      return;
    }
    error = '';
    navigate(`/schedule/${route}/${dayType}`);
  }

  /** @param {Event & { currentTarget: HTMLInputElement }} e */
  function handleInput(e) {
    // Allow only digits and letters (for variants like 126L)
    routeInput = e.currentTarget.value.replace(/[^0-9A-Za-z]/g, '');
    if (error) error = '';
  }
</script>

<div class="page">
  <DatabaseHeader
    title="PABT Gate Finder"
    description="Search NJ Transit bus departures from the Port Authority Bus Terminal. See your gate and get after-hours warnings before you walk to the wrong floor."
    byline="Chrissy Wang"
    date="Spring 2025"
  />

  <!-- Search card -->
  <form class="search-card card" onsubmit={handleSubmit} novalidate>
    <h2 class="search-card__heading">Find your bus</h2>

    <!-- Route input -->
    <div class="field">
      <label class="field__label" for="route-input">
        Route number
      </label>
      <input
        id="route-input"
        type="text"
        inputmode="numeric"
        class="input-field search-card__route-input"
        placeholder=""
        value={routeInput}
        oninput={handleInput}
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        aria-describedby={error ? 'route-error' : 'route-hint'}
        aria-invalid={!!error}
        maxlength="5"
      />
      {#if error}
        <p class="field__error" id="route-error" role="alert">{error}</p>
      {:else}
        <p class="field__hint-text" id="route-hint">
          Gate data available for: {knownRoutes.join(', ')}
        </p>
      {/if}
    </div>

    <!-- Day type toggle -->
    <div class="field">
      <span class="field__label" id="day-label">Service day</span>
      <div class="toggle-group" role="radiogroup" aria-labelledby="day-label">
        <button
          type="button"
          class="toggle-btn"
          class:active={dayType === 'weekday'}
          role="radio"
          aria-checked={dayType === 'weekday'}
          onclick={() => dayType = 'weekday'}
        >
          Weekday
        </button>
        <button
          type="button"
          class="toggle-btn"
          class:active={dayType === 'weekend'}
          role="radio"
          aria-checked={dayType === 'weekend'}
          onclick={() => dayType = 'weekend'}
        >
          Weekend
        </button>
      </div>
      <p class="field__hint-text">
        Auto-detected from today — override if needed.
      </p>
    </div>

    <button type="submit" class="btn btn-primary search-card__submit">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.75"/>
        <path d="M10 10L14 14" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
      </svg>
      Find gates &amp; departures
    </button>
  </form>

  <!-- What this tool does -->
  <section class="about-section" aria-labelledby="about-heading">
    <h2 id="about-heading" class="about-section__heading">What this does</h2>
    <ul class="about-list">
      <li>
        <span class="about-list__icon" aria-hidden="true">🚌</span>
        Shows every scheduled departure for your route with its PABT gate
      </li>
      <li>
        <span class="about-list__icon" aria-hidden="true">⚠️</span>
        Flags after-hours gate changes at <strong>10 PM</strong> and <strong>1 AM</strong>
      </li>
      <li>
        <span class="about-list__icon" aria-hidden="true">📍</span>
        Sticky "next departure" banner so you always know your current gate
      </li>
      <li>
        <span class="about-list__icon" aria-hidden="true">📅</span>
        Separate weekday and weekend schedules — auto-detected from today
      </li>
    </ul>
  </section>

  <MethodologyBox />
</div>

<style>
  .search-card {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .search-card__heading {
    font-family: var(--font-sans);
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-navy-dark);
    margin: 0;
  }

  .search-card__route-input {
    font-size: 1.375rem;
    font-family: var(--font-mono);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 0.875rem 1rem;
  }

  .search-card__submit {
    width: 100%;
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field__label {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

.field__hint-text {
    font-size: 0.78125rem;
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.5;
  }

  .field__error {
    font-size: 0.8125rem;
    color: var(--color-red);
    font-weight: 500;
    margin: 0;
  }

  .about-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    padding: 1.25rem 1.5rem;
  }

  .about-section__heading {
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-secondary);
    margin: 0 0 0.875rem;
  }

  .about-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .about-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    font-size: 0.9375rem;
    color: var(--color-text-secondary);
    line-height: 1.55;
  }

  .about-list__icon {
    flex-shrink: 0;
    font-size: 1em;
    line-height: 1.55;
  }
</style>
