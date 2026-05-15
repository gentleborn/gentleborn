import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        'src/app/**',
      ],
      thresholds: {
        'src/lib/phi.ts': { lines: 100, branches: 100, functions: 100 },
        'src/lib/crypto/**': { lines: 100, branches: 100, functions: 100 },
        'src/lib/stedi/**': { lines: 90, branches: 80, functions: 90 },
        'src/lib/nppes/**': { lines: 90, branches: 80, functions: 90 },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` is a Next.js runtime guard that throws on the client.
      // In Vitest (node env) it has no purpose; alias to an empty module.
      'server-only': path.resolve(__dirname, './vitest.server-only-shim.ts'),
    },
  },
});
