import { ComponentPortal } from '@angular/cdk/portal';
import { Directive } from '@angular/core';

import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';

import { ExampleCustomTooltipComponent } from './example-custom-tooltip.component';

@Directive({
    selector: '[exampleCustomTooltip]',
    standalone: true,
    exportAs: 'exampleCustomTooltip',
})
export class ExampleCustomTooltipDirective extends NxTooltipV2Directive {
    override portal = new ComponentPortal(ExampleCustomTooltipComponent);
}
