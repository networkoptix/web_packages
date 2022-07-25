import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxThreeDotDropdown } from './three-dot.component';

@NgModule({
    imports: [
        SharedComponentsModule,
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
