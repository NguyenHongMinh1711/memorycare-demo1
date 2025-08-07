import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [
        VitePWA({
          registerType: 'autoUpdate',
          srcDir: '.',
          filename: 'service-worker.js',
          manifest: {
            name: "MemoryCare",
            short_name: "MemoryCare",
            description: "An application to help with memory care, daily planning, and staying connected.",
            start_url: ".",
            display: "standalone",
            background_color: "#f1f5f9",
            theme_color: "#4f46e5",
            orientation: "portrait-primary",
            icons: [
              {
                src: "/maskable-icon-512x512.png",
                sizes: "512x512",
                "type": "image/png",
                "purpose": "any maskable"
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GOONG_API_KEY': JSON.stringify(env.GOONG_API_KEY),
        'process.env.GOONG_MAPTILES_KEY': JSON.stringify(env.GOONG_MAPTILES_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
