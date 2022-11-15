import { Injectable } from '@angular/core';

import type { Toast, ToastOptions } from '@components/toast/toast.types';
import { Translatable } from '@pipes/any-translate.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@Injectable({ providedIn: 'root' })
export class NxToastService {
    CONFIG: IConfig;
    toasts: Toast[] = [];
    defaultOpts: ToastOptions;

    constructor(
        configService: NxConfigService
    ) {
        this.CONFIG = configService.getConfig();
        this.defaultOpts = {
            autohide: false,
            delay: this.CONFIG.alertTimeout,
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
        type: string = this.CONFIG.toast.info,
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
        type: string = this.CONFIG.toast.info,
        delay: number = this.CONFIG.alertTimeout,
    ): void {
        const options = { autohide: true, delay };

        return this.show(message, type, options);
    }
}
