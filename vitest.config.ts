import { readFileSync } from 'fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
        alias: {
            '@': '/src',
            '@shared': '/shared',
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts', 'shared/**/*.test.ts'],
        exclude: ['node_modules/**', 'dist/**', 'server/**'],
    },
});
