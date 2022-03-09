import { Injectable, TemplateRef } from '@angular/core';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@Injectable({ providedIn: 'root' })
export class NxToastService {
    CONFIG: IConfig;
    toasts: any[] = [];

    constructor(
        configService: NxConfigService
    ) {
        this.CONFIG = configService.getConfig();
    }

    show(textOrTpl: string | TemplateRef<any>, options: any = {}) {
        const toast = this.toasts.find(obj => obj.textOrTpl === textOrTpl);
        if (!toast) {
            this.toasts.push({ textOrTpl, ...options });
        }
    }

    remove(toast?) {
        if (toast) {
            this.toasts = this.toasts.filter(t => t !== toast);
        } else {
            this.toasts = [];
        }
    }

    notify(message: string, type = this.CONFIG.toast.info, hold = false) {
        const options = {
            autohide: !hold,
            classname: type,
            delay: this.CONFIG.alertTimeout
        };

        return this.show(message, options);
    }
}
