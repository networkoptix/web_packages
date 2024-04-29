import { Component, input } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-hint',
    templateUrl: './hint.component.html',
    imports: [NxAddSvgSrcDirective, AngularSvgIconModule, NxTooltipDirective],
    providers: [],
    standalone: true,
})
export class NxHintComponent {
    icons = icons;
    tooltipText$$ = input.required<string>({ alias: 'tooltipText' });
    iconSrc$$ = input<string>(icons.dir + 'question.svg', { alias: 'iconSrc' });
}
