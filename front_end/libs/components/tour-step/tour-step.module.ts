import { NgModule } from '@angular/core';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxTourStepComponent } from './tour-step.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        TourMatMenuModule
    ],
    declarations: [
        NxTourStepComponent
    ],
    providers: [
        NxTourStepComponent
    ],
    exports: [
        NxTourStepComponent
    ]
})

export class TourStepModule { }
