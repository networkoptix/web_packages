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
    WebGlTimeUnderMouseComponent
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/time-under-mouse/time-under-mouse.component';
import {
    WebGlTimelinePlaybackIndicatorComponent
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/timeline-playback-indicator/timeline-playback-indicator.component';
import {
    WebGlTimelineSelectionComponent
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/timeline-selection/timeline-selection.component';
import {
    NxWebGLCanvasComponent
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/webgl-canvas.component';
import {
    WebGlTimelineZoomComponent
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/zoom/timeline-zoom.component';

@NgModule({
    declarations: [
        NxWebGLCanvasComponent,
        TimelineScrollComponent,
        WebGlTimelineZoomComponent,
        WebGlTimeUnderMouseComponent,
        WebGlTimelinePlaybackIndicatorComponent,
        WebGlTimelineSelectionComponent,
        WebGlTimelineZoomComponent,
    ],
    exports: [
        NxWebGLCanvasComponent,
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
