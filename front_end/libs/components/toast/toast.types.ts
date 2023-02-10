import { Translatable } from '@pipes/nx-translate.types';

export interface ToastOptions {
    autohide?: boolean;
    delay?: number;
    showHTML?: boolean;
}

export interface Toast extends ToastOptions {
    content: Translatable;
    type: string;
}
