import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxTooltipComponent } from './tooltip.component';

@NgModule({
    imports: [CommonModule, PortalModule],
    declarations: [NxTooltipComponent],
    providers: [NxTooltipComponent],
    exports: [NxTooltipComponent],
})
export class TooltipModule {}
