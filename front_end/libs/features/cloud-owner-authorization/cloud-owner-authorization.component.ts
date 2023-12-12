import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';

import staticLang from '@language_static';
import { OauthService } from '@services/oauth.service';
import { CloudBindData } from '@services/system-api.types';
import { WINDOW } from '@services/window-provider';
import { oauthStore } from '@static-variables';

@Component({
    selector: 'nx-cloud-owner-authorization',
    template: '',
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

    handleBind(data: CloudBindData): void {
        this.storageService.store(oauthStore.bindData, data);
        this.window.close();
    }

    ngOnInit(): void {
        const params = this.activatedRoute.snapshot.queryParams;
        const code = params?.code || '';
        if (code) {
            return this.handleCode(code);
        }

        if (params?.authKey) {
            const { authKey, systemId, organizationId, owner } = params;
            return this.handleBind({ authKey, systemId, organizationId, owner });
        }

        // eslint-disable-next-line camelcase
        const accessToken = params?.access_token || '';
        const state = params?.state || 'renew';
        const email = this.storageService.retrieve('loginState') || '';
        const systemName = params.system_name;
        this.oauthService.redirectOauth({
            state,
            email: email.includes('@') ? email : '',
            accessToken,
            systemName,
        });
    }
}
