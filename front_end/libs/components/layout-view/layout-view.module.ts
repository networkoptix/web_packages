import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { NxLayoutGridComponent } from '@components/layout-grid/layout-grid.component';
import { NxLayoutPtzComponent } from '@components/layout-ptz/layout-ptz.component';
// import { NxLayoutTimelineComponent } from '@components/layout-timeline/layout-timeline.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { WebGLTimelineModule } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/webgl-timeline.module';

import { NxLayoutViewComponent } from './layout-view.component';

@NgModule({
    imports: [
        CommonModule,
        NxLayoutGridComponent,
        // NxLayoutTimelineComponent,
        NxLayoutPtzComponent,
        TourMatMenuModule,
        NxPagePlaceholderComponent,
        WebGLTimelineModule,
    ],
    declarations: [NxLayoutViewComponent],
    providers: [NxLayoutViewComponent],
    exports: [NxLayoutViewComponent],
})
export class LayoutViewModule {}
