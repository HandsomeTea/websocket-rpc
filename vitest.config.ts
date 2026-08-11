import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.spec.ts'],
        coverage: {
            thresholds: {
                statements: 80,
                branches: 65,
                functions: 85,
                lines: 80,
            },
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/typings.ts', 'src/global.ts', 'src/index.ts'],
        }
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
});
