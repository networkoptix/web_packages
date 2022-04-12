import {
    animate,
    style,
    transition,
    trigger,
} from '@angular/animations';
import {
    Component,
} from '@angular/core';

import { NxToastService } from '@dialogs/toast.service';

@Component({
    selector: 'app-toasts',
    templateUrl: 'toast.container.html',
    styleUrls: ['toast.container.scss'],
    animations: [
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
export class NxToastsContainer {
    constructor(
        public toastService: NxToastService,
    ) {
    }

    remove(toast): void {
        this.toastService.remove(toast);
    }
}
