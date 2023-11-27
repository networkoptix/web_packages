import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { NxLayoutGridComponent } from '@components/layout-grid/layout-grid.component';
import { NxLayoutPtzComponent } from '@components/layout-ptz/layout-ptz.component';
// import { NxLayoutTimelineComponent } from '@components/layout-timeline/layout-timeline.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { LayoutStateModule } from '@services/layout-state/layout-state.module';

import { NxLayoutViewComponent } from './layout-view.component';

@NgModule({
    imports: [
        CommonModule,
        NxLayoutGridComponent,
        // NxLayoutTimelineComponent,
        NxLayoutPtzComponent,
        TourMatMenuModule,
        NxPagePlaceholderComponent,
        LayoutStateModule,
    ],
    declarations: [NxLayoutViewComponent],
    providers: [NxLayoutViewComponent],
    exports: [NxLayoutViewComponent],
})
export class LayoutViewModule {}
