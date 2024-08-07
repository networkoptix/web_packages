import type { CustomNxComponentsEventMap } from './lib/theme-provider/events';

declare global {
    interface Window {
        IS_STORYBOOK?: boolean;
        addEventListener<K extends keyof CustomNxComponentsEventMap>(
            type: K,
            listener: (this: Document, ev: CustomNxComponentsEventMap[K]) => void,
        ): void;
        removeEventListener<K extends keyof CustomNxComponentsEventMap>(
            type: K,
            listener: (this: Document, ev: CustomNxComponentsEventMap[K]) => void,
        ): void;
        dispatchEvent<K extends keyof CustomNxComponentsEventMap>(
            ev: CustomNxComponentsEventMap[K],
        ): void;
    }
}

export {};
