export interface TranslateObject {
    value: string;
    params?: Record<string, Translatable>;
}

export interface SingleTranslateObject {
    value: string;
    params?: Record<string, string>;
}

export type Translatable = string | TranslateObject | SingleTranslateObject;

export const isTranslatable = (value: unknown): value is Translatable => {
    if (typeof value === 'string') {
        return true;
    }

    if (typeof value === 'object' && value !== null) {
        return 'value' in value;
    }
    return false;
};
