import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DEV_');
  const target = env.DEV_API_TARGET ?? 'http://127.0.0.1:8765';
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
        manifest: {
          id: '/',
          name: 'Home Ledger',
          short_name: 'Home Ledger',
          description: 'Shared household spending and transaction review.',
          lang: 'en-US',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#02040a',
          theme_color: '#02040a',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/health(?:\/|$)/, /^\/webhooks(?:\/|$)/],
          runtimeCaching: [],
        },
      }),
    ],
    server: {
      port: Number(env.DEV_PORT ?? 5173),
      strictPort: true,
      proxy: { '/api': target, '/health': target },
    },
    build: { target: 'es2022' },
  };
});
