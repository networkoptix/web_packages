import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';

import { NxProcessButtonComponent } from './process-button.component';

@NgModule({
    imports: [
        CommonModule,
        AngularSvgIconModule,
        DirectivesModule,
    ],
    declarations: [
        NxProcessButtonComponent
    ],
    providers: [
        NxProcessButtonComponent
    ],
    exports: [
        NxProcessButtonComponent
    ]
})

export class ProcessButtonModule {}
