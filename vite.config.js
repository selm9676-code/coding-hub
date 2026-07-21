import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { lessonsPlugin } from './build-plugins/vite-plugin-lessons.js';
import { devLessonsMiddlewarePlugin } from './build-plugins/devLessonsMiddleware.js';

/**
 * Coding Hub — Vite build configuration.
 *
 * Non-negotiables enforced here (see project spec §2, §3):
 *  - Output is 100% static (HTML/CSS/JS/JSON/WASM/assets). No SSR, no server runtime.
 *  - Relative base path so the `dist/` folder works when dropped on any static host
 *    (Cloudflare Pages, GitHub Pages, Netlify, Vercel, Apache, Nginx) without config.
 *  - Manual chunking keeps heavy, route-specific dependencies (CodeMirror, fuse.js,
 *    highlight.js) out of the initial bundle so the JS budget in §21 stays under 150KB
 *    gzipped for the first paint.
 */
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/scripts', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    // Static hosts serve 404.html for unmatched paths; our router is hash-based so
    // this is only a safety net for direct hits on a non-existent deep path.
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            'codemirror',
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/commands',
            '@codemirror/language',
            '@codemirror/autocomplete',
            '@codemirror/search',
            '@lezer/highlight',
          ],
          'codemirror-langs': [
            '@codemirror/lang-javascript',
            '@codemirror/lang-python',
            '@codemirror/lang-cpp',
            '@codemirror/lang-rust',
          ],
          search: ['fuse.js'],
          highlight: ['highlight.js'],
          sanitize: ['dompurify'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    open: false,
  },
  plugins: [
    // Compiles src/data/**/*.md → dist/data/**/*.json at build time, and
    // generates dist/search-index.json (spec §5.2, §14).
    lessonsPlugin(),
    // Serves the same compiled shape on the fly during `npm run dev`, so
    // dev and prod always read from identical source content.
    devLessonsMiddlewarePlugin(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null, // we register the service worker ourselves in main.js
      manifest: false, // manifest.json is hand-authored in public/ for full control
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,json}'],
        navigateFallback: null, // hash routing means every deep link is index.html anyway
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.js'],
  },
});
