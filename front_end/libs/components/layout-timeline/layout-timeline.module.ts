import { NgModule } from '@angular/core';

import { ComponentsCommonModule } from '@components/components-common.module';
import { ComponentsCoreModule } from '@components/components-core.module';

import { NxLayoutTimelineComponent } from './layout-timeline.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        ComponentsCommonModule
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
