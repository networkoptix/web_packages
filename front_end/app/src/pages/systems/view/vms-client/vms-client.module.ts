import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'

import TimelinePageComponent from './pages/timeline/timeline-page.component'

import SystemPageComponent from './pages/system/system-page.component'
import CameraPageComponent from './pages/system/camera/camera-page.component'

import VmsModule from './submodules/vms/vms.module'
import PlaybackModule from './submodules/playback/playback.module'
import TimelineModule from './submodules/timeline/timeline.module'

import VmsClientRoutingModule from './vms-client-routing.module'


@NgModule({
  declarations: [
    TimelinePageComponent,
    SystemPageComponent,
    CameraPageComponent,
  ],
  imports: [
    BrowserModule,
    VmsModule,
    PlaybackModule,
    TimelineModule,
    VmsClientRoutingModule,
  ],
  providers: [
  ],
})
export class VmsClientModule {
}

export default VmsClientModule
