import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxThreeDotDropdown } from './three-dot.component';

@NgModule({
    imports: [
        CommonModule
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
