import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { DirectivesModule } from '@directives/directives.module';

import { NxActiveSystemDropdown } from './active-system.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        DirectivesModule
    ],
    declarations: [
        NxActiveSystemDropdown
    ],
    providers: [
        NxActiveSystemDropdown
    ],
    exports: [
        NxActiveSystemDropdown
    ]
})

export class ActiveSystemModule {}
