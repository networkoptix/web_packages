interface TranslatableObject {
    value: string,
    params?: unknown
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Translatable = string | TranslatableObject | any;
