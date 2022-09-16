import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxSwitchComponent } from './switch.component';

@NgModule({
    imports: [
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
