import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@netlify/vite-plugin-tanstack-start';

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(), // Must be before viteReact()
    viteReact(),
    netlify(),
  ],
  ssr: {
    // Don't externalize sneaks-api and its dependencies - bundle them instead
    noExternal: ['sneaks-api', 'express'],
  },
  build: {
    ssr: true,
    rollupOptions: {
      output: {
        // Ensure sneaks-api is bundled
        format: 'es',
      },
    },
  },
})

export default config
