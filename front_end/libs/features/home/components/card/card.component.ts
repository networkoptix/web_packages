import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxThreeDotDropdown } from '@components/dropdowns/three-dot/three-dot.component';
import { ActionItems } from '@components/dropdowns/three-dot/three-dot.component.types';

// Usage:
// - Using ng-contents nx-card takes 3 elements; icon, name, & stats
// <nx-card [icon]="icons.dir + 'organization.svg'" [svgStyle]="{ 'height.px' : '64', 'width.px' : '54' }">
//   <h3 name> Test Name </h3>
//   <div stats> </div>
// </nx-card>

@Component({
    selector: 'nx-card',
    templateUrl: 'card.component.html',
    styleUrls: ['card.component.scss'],
    standalone: true,
    imports: [AngularSvgIconModule, CommonModule, NxThreeDotDropdown],
})
export class NxCardComponent {
    @Input() dropdownItems: ActionItems[] = [];
    @Input() icon: string = '';
    @Input() svgStyle: { 'width.px': string; 'height.px': string } = {
        'width.px': '0',
        'height.px': '0',
    };
}
