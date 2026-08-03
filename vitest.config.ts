import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.spec.ts'],
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
});
