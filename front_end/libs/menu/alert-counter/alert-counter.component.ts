import { Component, Input } from '@angular/core';

import { icons } from '@lib/variables/static-variables';

@Component({
    selector: 'nx-alert-counter',
    templateUrl: './alert-counter.component.html',
    styleUrls: ['./alert-counter.component.scss'],
})
export class NxAlertCounter {
    @Input() count: number;
    @Input() type: string;
    icons = icons;
}
