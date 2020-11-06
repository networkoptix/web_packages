import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router';

import VideoManagementSystemService from './services/vms.service'

import IpInfoPipe from './pipes/ip_info.pipe'

import components from './components'

import MediaServerList from './components/media-server-list/media-server-list.component'
import { CommonModule } from '@angular/common';


@NgModule({
  declarations: [
    IpInfoPipe,
    components,
  ],
  imports: [
    CommonModule,
    RouterModule,
  ],
  exports: [
    MediaServerList,
  ],
  providers: [
    VideoManagementSystemService,
  ]
})
export class VmsClientVmsModule {
}

export default VmsClientVmsModule
