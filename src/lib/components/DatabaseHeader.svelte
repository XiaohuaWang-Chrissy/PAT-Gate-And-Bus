<script>
  const { title, description, byline, date } = $props();
</script>

<!-- DatabaseHeader: Required journalism-school component.
     Establishes editorial authority, project identity, and data provenance. -->
<header class="db-header">
  <div class="db-header__eyebrow" aria-label="Project type">
    Database Explorer
  </div>

  <h1 class="db-header__title">{title}</h1>

  <p class="db-header__description">{description}</p>

  <div class="db-header__meta" aria-label="Publication metadata">
    <span class="db-header__byline">By {byline}</span>
    <span class="db-header__sep" aria-hidden="true">·</span>
    <time class="db-header__date">{date}</time>
  </div>
</header>

<style>
  .db-header {
    padding-bottom: 1.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 3px solid var(--color-navy);
  }

  .db-header__eyebrow {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-red);
    margin-bottom: 0.5rem;
  }

  .db-header__title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(1.75rem, 5vw, 2.5rem);
    font-weight: 700;
    line-height: 1.15;
    color: var(--color-navy-dark);
    margin: 0 0 0.75rem;
    letter-spacing: -0.02em;
  }

  .db-header__description {
    font-size: 1rem;
    color: var(--color-text-secondary);
    line-height: 1.65;
    margin: 0 0 0.875rem;
    max-width: 40rem;
  }

  .db-header__meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }

  .db-header__byline {
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .db-header__sep {
    color: var(--color-border-strong);
  }
</style>
