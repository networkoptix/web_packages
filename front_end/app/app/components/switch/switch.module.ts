import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxSwitchComponent } from './switch.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxSwitchComponent
    ],
    providers: [
        NxSwitchComponent
    ],
    exports: [
        NxSwitchComponent
    ]
})

export class SwtichModule {}
