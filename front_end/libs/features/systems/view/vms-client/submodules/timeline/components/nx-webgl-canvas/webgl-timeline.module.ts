import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { DirectivesModule } from '@directives/directives.module';
import { WebGlTimelinePlaybackIndicatorComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/playback-indicator/timeline-playback-indicator.component';
import { TimelineScrollComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/scroll/timeline-scroll.component';
import { WebGlTimelineSelectionComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/selection/timeline-selection.component';
import { WebGlTimelineSelectionActionPanelComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/selection-action-panel/timeline-selection-action-panel.component';
import { WebGlTimeUnderMouseComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/time-under-mouse/time-under-mouse.component';
import { NxWebGLCanvasComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/webgl-canvas.component';
import { WebGlTimelineZoomComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/zoom/timeline-zoom.component';

@NgModule({
    declarations: [
        NxWebGLCanvasComponent,
        TimelineScrollComponent,
        WebGlTimelineZoomComponent,
        WebGlTimeUnderMouseComponent,
        WebGlTimelinePlaybackIndicatorComponent,
        WebGlTimelineSelectionComponent,
        WebGlTimelineZoomComponent,
        WebGlTimelineSelectionActionPanelComponent,
    ],
    exports: [NxWebGLCanvasComponent],
    imports: [
        CommonModule,
        AngularSvgIconModule,
        TranslateModule,
        DragDropModule,
        DirectivesModule,
        NxPreLoaderComponent,
    ],
    providers: [],
})
export class WebGLTimelineModule {}
