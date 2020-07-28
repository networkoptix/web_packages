import { Component, TemplateRef }              from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';

import { NxToastService }                      from '../../dialogs/toast.service';

@Component({
    selector    : 'app-toasts',
    templateUrl : 'toast.component.html',
    styleUrls   : ['toast.component.scss'],
    host        : { '[class.nx-toasts]': 'true' },
    animations  : [
        trigger('fadeInOut', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('.2s ease-in', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('.5s ease-out', style({ opacity: 0 }))
            ])
        ])
    ]
})
export class ToastsContainer {
    constructor(public toastService: NxToastService) {
    }

    isTemplate(toast) {
        return toast.textOrTpl instanceof TemplateRef;
    }

    remove(toast) {
        this.toastService.remove(toast);
    }
}
