import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { LayoutGridModule } from '@components/layout-grid/layout-grid.module';
import { LayoutPtzModule } from '@components/layout-ptz/layout-ptz.module';
import { LayoutTimelineModule } from '@components/layout-timeline/layout-timeline.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';

import { NxLayoutViewComponent } from './layout-view.component';

@NgModule({
    imports: [
        CommonModule,
        LayoutGridModule,
        LayoutTimelineModule,
        LayoutPtzModule,
        TourMatMenuModule,
        PagePlaceHolderModule
    ],
    declarations: [
        NxLayoutViewComponent
    ],
    providers: [
        NxLayoutViewComponent
    ],
    exports: [
        NxLayoutViewComponent
    ]
})

export class LayoutViewModule { }
