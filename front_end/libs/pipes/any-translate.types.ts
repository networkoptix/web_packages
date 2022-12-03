export interface TranslatableObject {
    value: string,
    parent?: string,
    params?: Record<string, TranslatableStrict>
}

export type TranslatableStrict = string | TranslatableObject | TranslatableObject[];

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Translatable = string | TranslatableObject | any;
