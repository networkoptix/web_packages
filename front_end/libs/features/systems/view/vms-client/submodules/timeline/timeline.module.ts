import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import {
    TimeUnderMouseComponent
} from './components/time-under-mouse/time-under-mouse.component';
import {
    TimelinePlaybackIndicatorComponent
} from './components/timeline-playback-indicator/timeline-playback-indicator.component';
import {
    TimelineScrollbarComponent
} from './components/timeline-scrollbar/timeline-scrollbar.component';
import {
    TimelineSelectionActionPanelComponent
} from './components/timeline-selection-action-panel/timeline-selection-action-panel.component';
import {
    TimelineSelectionComponent
} from './components/timeline-selection/timeline-selection.component';
import { TimelineComponent } from './components/timeline/timeline.component';
import {
    ZoomControlsComponent
} from './components/zoom-controls/zoom-controls.component';

@NgModule({
    declarations: [
        TimelineComponent,
        TimeUnderMouseComponent,
        TimelinePlaybackIndicatorComponent,
        TimelineScrollbarComponent,
        TimelineSelectionComponent,
        TimelineSelectionActionPanelComponent,
        ZoomControlsComponent,
    ],
    exports: [
        TimelineComponent,
        ZoomControlsComponent,
        TimelineSelectionActionPanelComponent,
        TimelineScrollbarComponent
    ],
    imports: [
        CommonModule,
        AngularSvgIconModule,
        TranslateModule,
    ],
    providers: []
})
export class VmsClientTimelineModule {
}
