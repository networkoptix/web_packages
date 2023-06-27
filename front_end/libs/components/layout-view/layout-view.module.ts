import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { NxLayoutGridComponent } from '@components/layout-grid/layout-grid.component';
import { NxLayoutPtzComponent } from '@components/layout-ptz/layout-ptz.component';
import { NxLayoutTimelineComponent } from '@components/layout-timeline/layout-timeline.component';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';

import { NxLayoutViewComponent } from './layout-view.component';

@NgModule({
    imports: [
        CommonModule,
        NxLayoutGridComponent,
        NxLayoutTimelineComponent,
        NxLayoutPtzComponent,
        TourMatMenuModule,
        PagePlaceHolderModule,
    ],
    declarations: [NxLayoutViewComponent],
    providers: [NxLayoutViewComponent],
    exports: [NxLayoutViewComponent],
})
export class LayoutViewModule {}
