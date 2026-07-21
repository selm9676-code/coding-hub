/**
 * main.js
 *
 * Application entry point. Order matters:
 *  1. bootstrap() — storage init + Store hydration must complete before
 *     the Router resolves the initial URL, so the first render already
 *     has real (or correctly-defaulted) state instead of flashing empty
 *     state and then re-rendering.
 *  2. Construct App (shell chrome) and Router (view mounting).
 *  3. Register route guards/hooks.
 *  4. Start the router, which immediately resolves window.location.hash.
 *  5. Register the service worker (spec §17) — done last and
 *     non-blocking so it never delays interactive content.
 */
import { App } from './scripts/app/App.js';
import { bootstrap } from './scripts/app/bootstrap.js';
import { Router } from './scripts/router/Router.js';
import { routes } from './scripts/router/routes.js';
import { recordLastRoute, confirmUnsavedChanges } from './scripts/router/guards.js';
import { store } from './scripts/store/Store.js';

async function main() {
  await bootstrap();

  const app = new App();
  app.renderShell();

  const router = new Router(routes, (match, path) => app.onRouteChange(match, path));
  router.beforeEach(confirmUnsavedChanges);
  router.afterEach(recordLastRoute);
  router.start();

  registerServiceWorker();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return; // avoid caching interference during local dev

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
}

main().catch((err) => {
  // Boot-time failure (e.g. both storage backends unavailable). Surface a
  // minimal, dependency-free error so the user isn't staring at a blank
  // skeleton forever (spec §23).
  console.error('Coding Hub failed to start:', err);
  const root = document.getElementById('main-content');
  if (root) {
    root.innerHTML = `
      <div style="padding: var(--space-8); text-align: center;">
        <h1>Coding Hub couldn't start</h1>
        <p style="color: var(--text-secondary); margin-top: var(--space-3);">
          Please reload the page. If this keeps happening, try a different browser
          or check that storage/cookies aren't blocked.
        </p>
        <button class="btn btn--primary" style="margin-top: var(--space-6);" onclick="window.location.reload()">
          Reload
        </button>
      </div>
    `;
  }
});

// Expose the store on window in dev builds only, to ease manual testing
// in the console without adding a debugging dependency.
if (import.meta.env.DEV) {
  window.__CODING_HUB_STORE__ = store;
}
