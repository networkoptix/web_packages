import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';

import { BaseDropdown } from '../injDropdown';

@Component({
    selector: 'nx-nav-location',
    templateUrl: 'nav.component.html',
    styleUrls: ['nav.component.scss'],
    imports: [CommonModule, NxArrowNavDirective, NxClickElsewhereDirective],
    standalone: true,
})
export class NxNavLocationDropdown extends BaseDropdown {
    @Input() location: any = {};

    constructor() {
        super();
    }

    hide() {
        this.show = false;
        return false;
    }
}
