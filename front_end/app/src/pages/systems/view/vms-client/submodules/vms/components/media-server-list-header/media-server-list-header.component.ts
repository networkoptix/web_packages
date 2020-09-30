import { Component, Output, EventEmitter, OnInit } from '@angular/core'
import { CookieService } from 'ngx-cookie-service';


const COOKIE_NAME = 'nx_show_ips'

@Component({
    selector: 'nx-media-server-list-header',
    templateUrl: 'media-server-list-header.component.html',
    styleUrls: ['media-server-list-header.component.scss']
})
export class NxMediaServerListHeaderComponent implements OnInit {
  @Output() ipVisibilityStateChange = new EventEmitter();
  @Output() filterTokenChange = new EventEmitter();

  constructor (
    protected cookieService: CookieService,
  ) {
  }

  // filterToken: string = ''
  ipVisibilityState: boolean = false

  onFilterTokenChange (token: string) {
    // this.filterToken = token
    this.filterTokenChange.emit(token)
  }

  onIpVisibilityStateChange (newValue: boolean) {
    this.ipVisibilityState = newValue
    this.ipVisibilityStateChange.emit(this.ipVisibilityState)
    this.cookieService.set(COOKIE_NAME, newValue ? '1' : '0', 365, '/')
  }

  public ngOnInit () {
    this.ipVisibilityState = !!parseInt(this.cookieService.get(COOKIE_NAME))
    this.ipVisibilityStateChange.emit(this.ipVisibilityState)
  }
}

export default NxMediaServerListHeaderComponent
