export interface TranslateObject {
    value: string;
    params?: Record<string, Translatable>;
}

export interface SingleTranslateObject {
    value: string;
    params?: Record<string, string>;
}

export type Translatable = string | TranslateObject | SingleTranslateObject;
