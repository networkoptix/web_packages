import { Injectable, TemplateRef } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NxToastService {
    toasts: any[] = [];

    show(textOrTpl: string | TemplateRef<any>, options: any = {}) {
        this.toasts.push({ textOrTpl, ...options });
    }

    remove(toast?) {
        if (toast) {
            this.toasts = this.toasts.filter(t => t !== toast);
        } else {
            this.toasts = [];
        }
    }
}