import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxNumericComponent } from './numeric.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxNumericComponent
    ],
    providers: [
        NxNumericComponent
    ],
    exports: [
        NxNumericComponent
    ]
})

export class NumericModule {}
