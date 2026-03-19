import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/server/**/*.test.ts', 'src/shared/**/*.test.ts'],
          setupFiles: ['src/server/test/setup.ts'],
        },
        resolve: {
          alias: {
            '@shared': path.resolve(__dirname, 'src/shared'),
          },
        },
      },
      {
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/client/**/*.test.tsx', 'src/client/**/*.test.ts'],
          setupFiles: ['src/client/test/setup.ts'],
        },
        resolve: {
          alias: {
            '@shared': path.resolve(__dirname, 'src/shared'),
            '@/': path.resolve(__dirname, 'src/client') + '/',
          },
        },
      },
    ],
  },
});
