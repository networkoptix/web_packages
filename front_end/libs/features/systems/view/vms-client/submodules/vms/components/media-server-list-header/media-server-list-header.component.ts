import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

const COOKIE_NAME = 'nx_show_ips';

@Component({
    selector: 'nx-media-server-list-header',
    templateUrl: 'media-server-list-header.component.html',
    styleUrls: ['media-server-list-header.component.scss'],
})
export class NxMediaServerListHeaderComponent implements OnInit {
    @Output() ipVisibilityStateChange = new EventEmitter<boolean>();
    @Output() filterTokenChange = new EventEmitter<string>();

    constructor(
        protected cookieService: CookieService
    ) {}

    // filterToken: string = ''
    public ipVisibilityState: boolean = false;
    public token: string = '';

    onFilterTokenChange(): void {
        this.filterTokenChange.emit(this.token);
    }

    onIpVisibilityStateChange(newValue: boolean): void {
        this.ipVisibilityState = newValue;
        this.ipVisibilityStateChange.emit(this.ipVisibilityState);
        this.cookieService.set(COOKIE_NAME, newValue ? '1' : '0', 365, '/');
    }

    public ngOnInit(): void {
        this.ipVisibilityState = !!parseInt(this.cookieService.get(COOKIE_NAME));
        this.ipVisibilityStateChange.emit(this.ipVisibilityState);
    }

    public resetSearch(): void {
        this.token = '';
        this.filterTokenChange.emit(this.token);
    }
}
