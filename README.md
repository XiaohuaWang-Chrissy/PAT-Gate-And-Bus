# PABT Gate Finder

A student project by **Chrissy Wang** for a journalism school database explorer course.

This tool helps NJ Transit riders find their Port Authority Bus Terminal (PABT) gate before heading to the terminal. It shows scheduled departures with gate assignments, flags after-hours gate changes (10 PM and 1 AM), and displays a sticky "next departure" banner with the current gate.

## About

**What it does**
- Shows every scheduled departure for a given NJ Transit bus route with its PABT gate number and floor
- Warns when gates change after 10 PM or 1 AM (after-hours shifts)
- Auto-detects whether today is a weekday or weekend
- Works for 29 routes with gate data

**Data sources**
- Gate assignments: [dougandadrienne.info/njbus/pabtgates/](https://dougandadrienne.info/njbus/pabtgates/) (scraped June 2024)
- Schedule data: NJ Transit GTFS-BUS feed (processed via `npm run gtfs`)

**Limitations**
- This is a student project — gate data may be outdated. Always confirm at terminal signage.
- Schedule data requires the NJ Transit GTFS feed to be placed in `./gtfs/` and processed locally.
- Some routes have gate rules but no schedule data yet; the gate reference table is still shown.

## Tech stack

- [Svelte 5](https://svelte.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- Hash-based SPA routing (no server required)
- Deployed to GitHub Pages

## Running locally

```bash
npm install
npm run dev
```

To process real NJ Transit schedule data:
1. Download `GTFS_BUS.zip` from [njtransit.com/developer](https://www.njtransit.com/developer)
2. Unzip into `./gtfs/`
3. Run `npm run gtfs`

## Deploy

```bash
npm run deploy
```

Deploys to GitHub Pages via the `gh-pages` package.
