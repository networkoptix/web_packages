import { Component, Output, EventEmitter } from '@angular/core'


@Component({
    selector: 'nx-media-server-list-header',
    templateUrl: 'media-server-list-header.component.html',
    styleUrls: ['media-server-list-header.component.scss']
})
export class NxMediaServerListHeaderComponent {
  @Output() ipVisibilityStateChange = new EventEmitter();
  @Output() filterTokenChange = new EventEmitter();

  // filterToken: string = ''
  ipVisibilityState: boolean = false

  onFilterTokenChange (token: string) {
    // this.filterToken = token
    this.filterTokenChange.emit(token)
  }

  onIpVisibilityStateChange (newValue: boolean) {
    this.ipVisibilityState = newValue
    this.ipVisibilityStateChange.emit(this.ipVisibilityState)
  }
}

export default NxMediaServerListHeaderComponent
