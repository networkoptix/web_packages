import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { ContentBlockSectionModule } from '../section/section.module';

import { NxAlertBlockComponent } from './block.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ContentBlockSectionModule,
        ComponentsCoreModule,
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
