import type { TemplateRef } from '@angular/core';

export interface ToastOptions {
    autohide?: boolean;
    delay?: number;
    showHTML?: boolean;
}

export interface Toast extends ToastOptions {
    content: string | TemplateRef<unknown>;
    type: string;
}
