import type { CustomThemeEventMap } from './lib/theme-provider/events';

declare global {
    interface Window {
        IS_STORYBOOK?: boolean;
        addEventListener<K extends keyof CustomThemeEventMap>(
            type: K,
            listener: (this: Document, ev: CustomThemeEventMap[K]) => void,
        ): void;
        removeEventListener<K extends keyof CustomThemeEventMap>(
            type: K,
            listener: (this: Document, ev: CustomThemeEventMap[K]) => void,
        ): void;
        dispatchEvent<K extends keyof CustomThemeEventMap>(ev: CustomThemeEventMap[K]): void;
    }
}

export {};
