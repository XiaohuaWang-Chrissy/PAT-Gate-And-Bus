<script>
  import { onMount } from 'svelte';
  import Search from './pages/Search.svelte';
  import ScheduleList from './pages/ScheduleList.svelte';
  import DepartureDetail from './pages/DepartureDetail.svelte';

  /**
   * Hash-based router — works perfectly with GitHub Pages (no server config needed).
   * Routes:
   *   #/                                          → Search
   *   #/schedule/:routeId/:dayType                → Schedule list
   *   #/departure/:routeId/:dayType/:departureId  → Departure detail
   */

  let route = $state({ page: 'search', params: {} });

  function parseHash() {
    const hash = (window.location.hash || '#/').replace(/^#\/?/, '');
    const parts = hash.split('/').filter(Boolean);

    if (parts.length === 0 || parts[0] === 'search') {
      route = { page: 'search', params: {} };
    } else if (parts[0] === 'schedule' && parts[1]) {
      route = {
        page: 'schedule',
        params: {
          routeId: parts[1].toUpperCase(),
          dayType: parts[2] || 'weekday',
        },
      };
    } else if (parts[0] === 'departure' && parts[1]) {
      route = {
        page: 'departure',
        params: {
          routeId: parts[1].toUpperCase(),
          dayType: parts[2] || 'weekday',
          departureId: parts[3] || '',
        },
      };
    } else {
      route = { page: 'search', params: {} };
    }
  }

  /** @param {string} path */
  function navigate(path) {
    window.location.hash = path;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  onMount(() => {
    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  });
</script>

<div class="app-shell">
  {#if route.page === 'search'}
    <Search {navigate} />
  {:else if route.page === 'schedule'}
    <ScheduleList
      {navigate}
      routeId={route.params.routeId}
      dayType={route.params.dayType}
    />
  {:else if route.page === 'departure'}
    <DepartureDetail
      {navigate}
      routeId={route.params.routeId}
      dayType={route.params.dayType}
      departureId={route.params.departureId}
    />
  {:else}
    <Search {navigate} />
  {/if}
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
  }
</style>
