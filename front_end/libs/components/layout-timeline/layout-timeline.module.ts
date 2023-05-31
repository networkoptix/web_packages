import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';

import { NxLayoutTimelineComponent } from './layout-timeline.component';

@NgModule({
    imports: [
        CommonModule,
        PreLoaderModule,
    ],
    declarations: [
        NxLayoutTimelineComponent
    ],
    providers: [
        NxLayoutTimelineComponent
    ],
    exports: [
        NxLayoutTimelineComponent
    ]
})

export class LayoutTimelineModule { }
