import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxLandingDisplayComponent } from './landing-display.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxLandingDisplayComponent
    ],
    providers: [
        NxLandingDisplayComponent
    ],
    exports: [
        NxLandingDisplayComponent
    ]
})

export class LandingDisplayModule {}
