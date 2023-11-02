import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';

import staticLang from '@language_static';
import { OauthService } from '@services/oauth.service';
import { oauthStore } from '@static-variables';

@Component({
    selector: 'nx-cloud-owner-authorization',
    template: '',
})
export class CloudOwnerAuthorizationComponent implements OnInit {
    LANG = staticLang;
    constructor(
        private oauthService: OauthService,
        private storageService: LocalStorageService,
        private activatedRoute: ActivatedRoute,
    ) {}

    handleCode(code: string): void {
        this.storageService.store(oauthStore.code, code);
        window.close();
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
