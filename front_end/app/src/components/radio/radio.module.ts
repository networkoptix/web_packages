import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxRadioComponent } from './radio.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxRadioComponent
    ],
    providers: [
        NxRadioComponent
    ],
    exports: [
        NxRadioComponent
    ]
})

export class RadioModule {}
