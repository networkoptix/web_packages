import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { NxTourStepComponent } from './tour-step.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
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
