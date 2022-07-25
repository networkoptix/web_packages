import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxTooltipComponent } from './tooltip.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxTooltipComponent
    ],
    providers: [
        NxTooltipComponent
    ],
    exports: [
        NxTooltipComponent
    ]
})

export class TooltipModule {}
