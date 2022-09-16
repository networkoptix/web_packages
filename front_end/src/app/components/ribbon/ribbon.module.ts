import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';

import { NxRibbonComponent } from './ribbon.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        ProcessButtonModule,
    ],
    declarations: [
        NxRibbonComponent
    ],
    providers: [
        NxRibbonComponent
    ],
    exports: [
        NxRibbonComponent
    ]
})

export class RibbonModule {}
