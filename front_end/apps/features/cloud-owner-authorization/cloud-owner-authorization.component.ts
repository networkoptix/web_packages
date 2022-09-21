import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { OauthService } from '@services/oauth.service';
import { WINDOW } from '@services/window-provider';
import { LanguageI18NStaticTypes } from '@src/language_i18n_static_types';

@Component({
    selector: 'nx-cloud-owner-authorization',
    template: ''
})
export class CloudOwnerAuthorizationComponent implements OnInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        @Inject(WINDOW) protected window: Window,
        private oauthService: OauthService,
        private storageService: LocalStorageService,
        private activatedRoute: ActivatedRoute
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
    }

    handleCode(code: string): void {
        this.storageService.store(this.CONFIG.oauthStore.code, code);
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
