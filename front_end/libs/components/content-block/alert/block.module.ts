import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ContentBlockSectionModule } from '../section/section.module';

import { NxAlertBlockComponent } from './block.component';

@NgModule({
    imports: [
        CommonModule,
        AngularSvgIconModule,
        ContentBlockSectionModule,
    ],
    declarations: [
        NxAlertBlockComponent
    ],
    providers: [
        NxAlertBlockComponent
    ],
    exports: [
        NxAlertBlockComponent
    ]
})

export class AlertBlockModule {}
