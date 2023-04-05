import { Injectable } from '@angular/core';

import type { Toast, ToastOptions } from '@components/toast/toast.types';
import { Translatable } from '@pipes/nx-translate.types';

import { alertTimeout, toast } from '../variables/static-variables';

@Injectable({ providedIn: 'root' })
export class NxToastService {
    toasts: Toast[] = [];
    defaultOpts: ToastOptions;

    constructor() {
        this.defaultOpts = {
            autohide: false,
            delay: alertTimeout,
            showHTML: false,
        };
    }

    /**
     * Show a toast.
     *
     * @param content Toast content
     * @param type Toast type (`info` (default)/`warning`/`danger`/`success`)
     * @param options Toast options
     *  - `autohide` (default `false`)
     *  - `delay` (default `CONFIG.alertTimeout`)
     *  - `showHTML` (default `false`)
     */
    show(
        content: Toast['content'],
        type: string = toast.info,
        options: ToastOptions = this.defaultOpts,
    ): void {
        options = { ...this.defaultOpts, ...options };
        const toast = this.toasts.find(obj => obj.content === content);
        if (!toast) {
            this.toasts.push({ content, type, ...options });
        }
    }

    remove(toast?: Toast): void {
        if (toast) {
            this.toasts = this.toasts.filter(t => t !== toast);
        } else {
            this.toasts = [];
        }
    }

    /** Display a notification toast that hides itself. */
    notify(
        message: Translatable,
        type: string = toast.info,
        delay: number = alertTimeout,
        showHTML: boolean = false,
    ): void {
        const options = { autohide: true, delay, showHTML };

        return this.show(message, type, options);
    }
}
