import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import CameraPageComponent from './pages/system/camera/camera-page.component';
import SystemPageComponent from './pages/system/system-page.component';
import TimelinePageComponent from './pages/timeline/timeline-page.component';
import PlaybackModule from './submodules/playback/playback.module';
import TimelineModule from './submodules/timeline/timeline.module';
import VmsModule from './submodules/vms/vms.module';
import VmsClientRoutingModule from './vms-client-routing.module';

@NgModule({
    declarations: [
        TimelinePageComponent,
        SystemPageComponent,
        CameraPageComponent
    ],
    imports: [
        CommonModule,
        TranslateModule,
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
