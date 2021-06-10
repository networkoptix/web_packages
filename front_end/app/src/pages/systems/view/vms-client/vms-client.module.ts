import { NgModule } from '@angular/core';

import TimelinePageComponent from './pages/timeline/timeline-page.component';

import SystemPageComponent from './pages/system/system-page.component';
import CameraPageComponent from './pages/system/camera/camera-page.component';

import VmsModule from './submodules/vms/vms.module';
import PlaybackModule from './submodules/playback/playback.module';
import TimelineModule from './submodules/timeline/timeline.module';

import VmsClientRoutingModule from './vms-client-routing.module';
import { CommonModule } from '@angular/common';

@NgModule({
    declarations: [
        TimelinePageComponent,
        SystemPageComponent,
        CameraPageComponent
    ],
    imports: [
        CommonModule,
        VmsModule,
        PlaybackModule,
        TimelineModule,
        VmsClientRoutingModule
    ],
    providers: [
    ],
    exports: [
    ]
})
export class VmsClientModule {
}

export default VmsClientModule;
