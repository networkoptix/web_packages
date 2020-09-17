import { Component, OnInit } from '@angular/core'
import VideoManagementSystemService from '../../submodules/vms/services/vms.service'
import Camera from '../../submodules/vms/datatypes/Camera'


@Component({
  selector: 'system-page',
  templateUrl: './system-page.component.html',
  styleUrls: ['./system-page.component.styl']
})
export class SystemPageComponent implements OnInit {

  public cameras: Array<Camera>

  constructor (
    private vms: VideoManagementSystemService
  ) {
    this.vms.setFakeData()
    this.cameras = this.vms.cameras
  }

  ngOnInit(): void {
  }

}

export default SystemPageComponent
