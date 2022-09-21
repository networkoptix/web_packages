import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxLandingDisplayComponent } from './landing-display.component';

@NgModule({
    imports: [
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
