import { Component, Input, OnInit } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

import staticLang from '@language_static';
import { OauthService } from '@services/oauth.service';
import { CloudBindData } from '@services/system-api.types/system.types';
import { oauthStore } from '@static-variables';

@Component({
    selector: 'nx-cloud-owner-authorization',
    template: '',
    imports: [],
    standalone: true,
})
export class CloudOwnerAuthorizationComponent implements OnInit {
    // All inputs in this component are coming from the queryString
    @Input() access_token: string = '';
    @Input() authKey: string = '';
    @Input() code: string = '';
    @Input() email: string = '';
    @Input() owner: string = '';
    @Input() organizationId: string = '';
    @Input() systemId: string = '';
    @Input() system_name: string = '';
    @Input() state: string = 'renew';

    LANG = staticLang;
    constructor(
        private oauthService: OauthService,
        private storageService: LocalStorageService,
    ) {}

    handleCode(code: string): void {
        this.storageService.store(oauthStore.code, code);
        window.close();
    }

    handleBind(data: CloudBindData): void {
        this.storageService.store(oauthStore.bindData, data);
        window.close();
    }

    ngOnInit(): void {
        if (this.code) {
            return this.handleCode(this.code);
        }

        if (this.authKey) {
            const { authKey, systemId, organizationId, owner } = this;
            return this.handleBind({ authKey, systemId, organizationId, owner });
        }

        const { access_token, email, state, system_name } = this;

        this.oauthService.redirectOauth({
            state,
            email,
            accessToken: access_token,
            systemName: system_name,
        });
    }
}
