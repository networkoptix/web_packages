import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxClickDoubleDirective } from '@directives/nx-single-double-click.directive';
import { WebGlTimeUnderMouseComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/interactions/time-under-mouse/time-under-mouse.component';
import { WebGlTimelineInteractionsComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/interactions/timeline-interactions.component';
import { WebGlPlaybackControlComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/playback-control/playback-control.component';
import { WebGlTimelinePlaybackIndicatorComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/playback-indicator/timeline-playback-indicator.component';
import { TimelineScrollComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/scroll/timeline-scroll.component';
import { WebGlTimelineSelectionComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/selection/timeline-selection.component';
import { WebGlTimelineSelectionActionPanelComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/selection-action-panel/timeline-selection-action-panel.component';
import { NxWebGLCanvasComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/webgl-canvas.component';
import { WebGlTimelineZoomComponent } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/zoom/timeline-zoom.component';

@NgModule({
    declarations: [
        NxWebGLCanvasComponent,
        WebGlTimelineInteractionsComponent,
        TimelineScrollComponent,
        WebGlTimelineZoomComponent,
        WebGlTimeUnderMouseComponent,
        WebGlTimelinePlaybackIndicatorComponent,
        WebGlTimelineSelectionComponent,
        WebGlTimelineZoomComponent,
        WebGlTimelineSelectionActionPanelComponent,
        WebGlPlaybackControlComponent,
    ],
    exports: [NxWebGLCanvasComponent],
    imports: [
        CommonModule,
        AngularSvgIconModule,
        TranslateModule,
        DragDropModule,
        NxPreLoaderComponent,
        NxAddSvgSrcDirective,
        NxClickDoubleDirective,
    ],
    providers: [],
})
export class WebGLTimelineModule {}
