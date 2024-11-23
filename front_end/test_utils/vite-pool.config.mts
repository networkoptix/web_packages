import { InlineConfig } from "vitest";

export const vitePoolConfig: InlineConfig = {
    pool: 'forks',
    poolOptions: {
        forks: {
            maxForks: 4,
            minForks: 1,
        }
    }
}
