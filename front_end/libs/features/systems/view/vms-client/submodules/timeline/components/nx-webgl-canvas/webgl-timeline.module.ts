import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';
import {
    TimelineScrollComponent
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/scroll/timeline-scroll.component';
import {
    NxWebGLCanvasComponent
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/webgl-canvas.component';
import {
    TimelineZoomComponent
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/zoom/timeline-zoom.component';

@NgModule({
    declarations: [
        NxWebGLCanvasComponent,
        TimelineScrollComponent,
        TimelineZoomComponent,
    ],
    exports: [
        NxWebGLCanvasComponent,
        TimelineScrollComponent,
    ],
    imports: [
        CommonModule,
        AngularSvgIconModule.forRoot(),
        TranslateModule,
        DragDropModule,
        DirectivesModule,
    ],
    providers: []
})
export class WebGLTimelineModule {
}
