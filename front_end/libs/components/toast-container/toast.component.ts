import { animate, style, transition, trigger } from '@angular/animations';
import { Component, HostBinding } from '@angular/core';

import { NxToastService } from '@services/toast.service';
import { useNewCloud } from '@utils/general';

import type { Toast } from './toast.types';

@Component({
    selector: 'nx-app-toasts',
    templateUrl: 'toast.component.html',
    styleUrls: ['toast.component.scss'],
    animations: [
        trigger('fadeInOut', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('.2s ease-in', style({ opacity: 1 })),
            ]),
            transition(':leave', [animate('.5s ease-out', style({ opacity: 0 }))]),
        ]),
    ],
})
export class NxToastsContainer {
    @HostBinding('class.new-cloud-layout') newCloudLayout = useNewCloud();
    constructor(public toastService: NxToastService) {}

    remove(toast: Toast): void {
        this.toastService.remove(toast);
    }
}
