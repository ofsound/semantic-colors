import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    watch: {
      ignored: [
        '**/.semantic-colors/**',
        '**/semantic-colors.project.json',
        '**/theme.manifest.json',
        '**/semantic-theme.generated.css'
      ]
    }
  },
  ssr: {
    noExternal: ['bits-ui']
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,js}', 'extension/src/**/*.{test,spec}.{ts,js}']
  }
});
