import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxSwitchComponent } from './switch.component';

@NgModule({
    imports: [
        CommonModule
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

export class SwitchModule {}
