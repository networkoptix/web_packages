import path from 'path';
import type { InlineConfig } from "vitest";

export function vitestConfig(name: string): InlineConfig {
    return {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['src/test-setup.ts'],
        include: ['**/*.spec.ts'],

        disableConsoleIntercept: true,
        reporters: [
            'basic', // Default reporter consumes logs
            [
                'junit',
                {
                  addFileAttribute: false,
                  includeConsoleOutput: false,
                  outputFile: `${path.resolve(__dirname, '..')}/junit/${name}/junit.xml`
                },
            ],
        ],

        pool: 'forks',
        poolOptions: {
            forks: {
                maxForks: 4,
                minForks: 1,
            }
        }
    }
}
