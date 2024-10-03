import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';

const COOKIE_NAME = 'nx_show_ips';

@Component({
    selector: 'nx-media-server-list-header',
    templateUrl: 'media-server-list-header.component.html',
    styleUrls: ['media-server-list-header.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
})
export class NxMediaServerListHeaderComponent implements OnInit {
    @Output() ipVisibilityStateChange = new EventEmitter<boolean>();
    @Output() filterTokenChange = new EventEmitter<string>();

    constructor(private cookieService: CookieService) {}

    ipVisibilityState: boolean = false;
    token: string = '';

    onFilterTokenChange(): void {
        this.filterTokenChange.emit(this.token);
    }

    onIpVisibilityStateChange(newValue: boolean): void {
        this.ipVisibilityState = newValue;
        this.ipVisibilityStateChange.emit(this.ipVisibilityState);
        this.cookieService.set(COOKIE_NAME, newValue ? '1' : '0', 365, '/');
    }

    ngOnInit(): void {
        this.ipVisibilityState = !!parseInt(this.cookieService.get(COOKIE_NAME));
        this.ipVisibilityStateChange.emit(this.ipVisibilityState);
    }

    resetSearch(): void {
        this.token = '';
        this.filterTokenChange.emit(this.token);
    }
}
