import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: false,
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'coverage/**',
        'dist/**',
        'node_modules/**',
        'test/**',
        '**/*.spec.ts',
        '**/*.e2e-spec.ts',
        '**/*.dto.ts',
        '**/*.entity.ts',
        '**/main.ts',
      ],
    },
    pool: 'forks',
    reporters: ['default'],
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
