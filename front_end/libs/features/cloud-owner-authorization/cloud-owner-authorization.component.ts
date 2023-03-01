import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';

import staticLang from '@common/language/language_i18n_static.json';
import { oauthStore } from '@lib/variables/static-variables';
import { OauthService } from '@services/oauth.service';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'nx-cloud-owner-authorization',
    template: ''
})
export class CloudOwnerAuthorizationComponent implements OnInit {
    LANG = staticLang;
    constructor(
        @Inject(WINDOW) protected window: Window,
        private oauthService: OauthService,
        private storageService: LocalStorageService,
        private activatedRoute: ActivatedRoute,
    ) {}

    handleCode(code: string): void {
        this.storageService.store(oauthStore.code, code);
        this.window.close();
    }

    ngOnInit(): void {
        const params = this.activatedRoute.snapshot.queryParams;
        const code = params?.code || '';
        if (code) {
            return this.handleCode(code);
        }

        // eslint-disable-next-line camelcase
        const accessToken = params?.access_token || '';
        const state = params?.state || 'renew';
        const email = this.storageService.retrieve('loginState') || '';
        this.oauthService.redirectOauth(state, email.includes('@') ? email : '', '', accessToken);
    }
}
