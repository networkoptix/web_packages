import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';

import { NxMatLikeInputComponent } from './input.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        DirectivesModule
    ],
    declarations: [
        NxMatLikeInputComponent
    ],
    providers: [
        NxMatLikeInputComponent
    ],
    exports: [
        NxMatLikeInputComponent
    ]
})

export class NxMatLikeInputModule {}
