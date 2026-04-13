import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

// Update base to match your GitHub repo name before deploying
// e.g. if repo is github.com/you/pabt-gate-finder, set base: '/pabt-gate-finder/'
export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte(),
  ],
  base: '/PAT-Gate-And-Bus/',
})
