<script>
  // Optional: pass additional notes as a slot or prop
</script>

<!-- MethodologyBox: Required journalism-school component.
     Documents data sourcing, methodology, and limitations. -->
<aside class="method-box" aria-label="Data methodology">
  <div class="method-box__header">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
      <path d="M8 7v5M8 5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    Methodology &amp; Data Sources
  </div>

  <div class="method-box__body">
    <section class="method-section">
      <h3>Gate Assignments</h3>
      <p>
        Gate data is derived from
        <a href="https://dougandadrienne.info/njbus/pabtgates/" target="_blank" rel="noopener noreferrer">
          dougandadrienne.info/njbus/pabtgates/
        </a>, current as of June 2024.
        Gate assignments are <strong>subject to change without notice</strong>.
        Always verify at terminal signage before boarding.
      </p>
      <p>
        Late-night gate changes occur at approximately <strong>10:00 PM</strong> and
        <strong>1:00 AM</strong>. After-hours departures (after 10 PM or before 6 AM)
        are flagged with a warning badge.
      </p>
    </section>

    <section class="method-section">
      <h3>Bus Schedules</h3>
      <p>
        Schedule data is derived from the
        <strong>NJ Transit GTFS-BUS static feed</strong> (developer access),
        filtered to PABT-originating trips. Times shown are scheduled departures
        and may differ from actual departures due to traffic, service changes,
        or special events.
      </p>
    </section>

    <section class="method-section">
      <h3>Weekday vs. Weekend Service</h3>
      <p>
        This tool auto-detects today's day type and pre-selects the appropriate
        service calendar. You can override using the Weekday / Weekend toggle.
        Holiday service may follow a different schedule — consult
        <a href="https://www.njtransit.com" target="_blank" rel="noopener noreferrer">njtransit.com</a>
        for holiday schedules.
      </p>
    </section>

    <p class="method-box__disclaimer">
      This is an independent journalism school project and is not affiliated with
      NJ Transit or the Port Authority of New York and New Jersey.
    </p>
  </div>
</aside>

<style>
  .method-box {
    margin-top: 3rem;
    padding: 1.25rem 1.5rem;
    background: var(--color-surface-subtle);
    border: 1px solid var(--color-border);
    border-left: 4px solid var(--color-navy);
    border-radius: var(--radius-lg);
    font-size: 0.875rem;
  }

  .method-box__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-navy);
    margin-bottom: 1rem;
  }

  .method-box__body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .method-section h3 {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.35rem;
    font-family: var(--font-sans);
  }

  .method-section p {
    color: var(--color-text-secondary);
    line-height: 1.65;
    margin: 0 0 0.5rem;
  }

  .method-section p:last-child { margin-bottom: 0; }

  a {
    color: var(--color-navy-mid);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  a:hover { color: var(--color-navy-dark); }

  .method-box__disclaimer {
    color: var(--color-text-muted);
    font-size: 0.8rem;
    font-style: italic;
    border-top: 1px solid var(--color-border);
    padding-top: 0.75rem;
    margin-top: 0.5rem;
  }
</style>
