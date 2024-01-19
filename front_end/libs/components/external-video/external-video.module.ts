import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxExternalVideoComponent } from './external-video.component';

@NgModule({
    imports: [
        CommonModule
    ],
    declarations: [
        NxExternalVideoComponent
    ],
    providers: [
        NxExternalVideoComponent
    ],
    exports: [
        NxExternalVideoComponent
    ]
})

export class ExternalVideoModule {}
