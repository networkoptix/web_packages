import { Component, OnInit } from '@angular/core'
import VideoManagementSystemService from '../../submodules/vms/services/vms.service'
import VmsState, { VMS_MODE } from '../../submodules/vms/datatypes/VmsState'
import MediaServer from '../../submodules/vms/datatypes/MediaServer'
import { Subscription } from 'rxjs'


@Component({
  selector: 'system-page',
  templateUrl: './system-page.component.html',
  styleUrls: ['./system-page.component.styl']
})
export class SystemPageComponent implements OnInit {

  protected _state: VmsState
  protected _subscription: Subscription

  public get mediaServers (): Array<MediaServer> {
    return this._state && this._state.mode !== VMS_MODE.NOT_INITIALIZED
      ? this._state.mediaServers
      : []
  }

  constructor (
    private vms: VideoManagementSystemService
  ) {
    this.onVmsSubjectChange = this.onVmsSubjectChange.bind(this)
  }

  public ngOnInit(): void {
    this.vms.setTestMediaServers()
    this._subscription = this.vms.subject.subscribe(this.onVmsSubjectChange)
  }

  public ngOnDestroy (): void {
    this._subscription.unsubscribe()
  }

  public onVmsSubjectChange (s: VmsState) {
    this._state = s
  }

}

export default SystemPageComponent
