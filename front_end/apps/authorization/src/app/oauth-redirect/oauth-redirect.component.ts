import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';
import { DeviceDetectorService } from 'ngx-device-detector';
import { LocalStorageService } from 'ngx-webstorage';

import { WINDOW } from '@services/window-provider';

import { AuthorizeParams, ClientType } from '../components/authorize.component.types';

/* eslint-disable camelcase */
@UntilDestroy()
@Component({
    selector: 'nx-oauth-redirect-component',
    templateUrl: './oauth-redirect.component.html',
    styleUrls: ['./oauth-redirect.component.scss'],
})
export class NxOAuthRedirectComponent implements OnInit {
    initialData: AuthorizeParams;
    clientType: ClientType;
    viewType: 'desktop' | 'mobile' | 'web';
    state: 'readyToLogin' | 'noNativeClient' | undefined;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private localStorageService: LocalStorageService,
        private deviceService: DeviceDetectorService,
        @Inject(WINDOW) public window: Window,
    ) {}

    ngOnInit(): void {
        if (this.window.nativeClient) {
            this.route.queryParams.subscribe(async (params: AuthorizeParams) => {
                this.initialData = cloneDeep(params);
                const { client_type, code, view_type } = this.initialData;
                this.localStorageService.store('client_type', client_type);
                this.viewType = view_type || 'desktop';
                if (code) {
                    this.state = undefined;
                    this.localStorageService.clear('client_type');
                    if (client_type === 'system2faAuth') {
                        nativeClient.twoFaVerified(code);
                    } else {
                        nativeClient.setCode(code);
                    }
                } else {
                    this.state = 'readyToLogin';
                }
            });
        } else if (this.deviceService.isMobile()) {
            this.route.queryParams.subscribe(async (params: AuthorizeParams) => {
                this.initialData = cloneDeep(params);
                this.viewType = this.initialData.view_type || 'desktop';
                this.state = undefined;
            });
        } else {
            this.state = 'noNativeClient';
        }
    }

    redirectToOAuth(): void {
        const { client_id, client_type, view_type } = this.initialData || {};
        this.router.navigate(['/'], {
            queryParams: {
                client_id: client_id || this.deviceService.isMobile() ? 'mobile' : 'desktop',
                client_type: client_type || 'loginSystem',
                redirect_uri: '/redirect-oauth',
                view_type: view_type || 'desktop',
                response_type: 'code',
            },
        });
    }
}
