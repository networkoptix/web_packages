import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { OauthService } from '@services/oauth.service';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'cloud-owner-authorization',
    template: ''
})
export class CloudOwnerAuthorizationComponent implements OnInit {
    LANG: LanguageI18NStaticTypes
    constructor(
        languageService: NxLanguageProviderService,
        @Inject(WINDOW) protected window: Window,
        private oauthService: OauthService,
        private storageService: LocalStorageService,
        private activatedRoute: ActivatedRoute
    ) {
        this.LANG = languageService.translations;
    }

    handleCode (code) {
        this.storageService.store('new-code', code);
        this.window.close();
    }

    ngOnInit() {
        const params = this.activatedRoute.snapshot.queryParams;
        const code = params?.code || '';
        if (code) {
            return this.handleCode(code);
        }

        const state = params?.state || 'renew';
        const email = this.storageService.retrieve('loginState');
        this.oauthService.redirectOauth(state, email.includes('@') ? email : '');
    }
}
