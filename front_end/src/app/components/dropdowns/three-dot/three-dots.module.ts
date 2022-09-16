import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxThreeDotDropdown } from './three-dot.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxThreeDotDropdown
    ],
    providers: [
        NxThreeDotDropdown
    ],
    exports: [
        NxThreeDotDropdown
    ]
})

export class ThreeDotsModule {}
