import { Component, OnInit, OnDestroy } from '@angular/core'

import { Subscription } from 'rxjs'

import VideoManagementSystemService from '../../../../../vms-client/submodules/vms/services/vms.service'
import VmsState, { VMS_MODE } from '../../../../../vms-client/submodules/vms/datatypes/VmsState'
import MediaServer from '../../../../../vms-client/submodules/vms/datatypes/MediaServer'


@Component({
    selector: 'media-server-list',
    templateUrl: 'media-server-list.component.html',
    styleUrls: ['media-server-list.component.scss']
})
export class MediaServerListComponent implements OnInit, OnDestroy {

  protected _vmsStateSubscription: Subscription
  public mediaservers: Array<MediaServer>

  constructor (
    private vms: VideoManagementSystemService
  ) {
    this._onVmsSubjectChange = this._onVmsSubjectChange.bind(this)
  }

  public ngOnInit(): void {
    this._vmsStateSubscription = this.vms.subject.subscribe(this._onVmsSubjectChange)
  }

  public ngOnDestroy (): void {
    this._vmsStateSubscription.unsubscribe()
  }

  protected _onVmsSubjectChange (s: VmsState) {
    switch (s.mode) {
      case VMS_MODE.NOT_INITIALIZED:
        this.mediaservers = []
        break
      case VMS_MODE.CAMERA_NOT_SELECTED:
      case VMS_MODE.CAMERA_SELECTED:
        this.mediaservers = s.mediaServers
    }
  }
}

export default MediaServerListComponent
