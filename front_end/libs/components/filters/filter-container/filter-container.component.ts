import { CommonModule } from '@angular/common';
import { Component, contentChild, input } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@variables/static-variables';

import { BaseFilterComponent } from '../base-filter.component';

@Component({
    imports: [CommonModule, AngularSvgIconModule, NxAddSvgSrcDirective],
    selector: 'nx-filter-container',
    templateUrl: 'filter-container.component.html',
    styleUrls: ['filter-container.component.scss'],
    standalone: true,
})
export class NxFilterContainerComponent {
    header = input.required<string>();

    icons = icons;

    filterComponent = contentChild.required(BaseFilterComponent);

    onClearClick(): void {
        this.filterComponent().clearSelectedValue();
    }
}
