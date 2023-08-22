import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';

import { NxThreeDotDropdown } from './three-dot.component';

@NgModule({
    imports: [
        CommonModule,
        NxClickElsewhereDirective
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
