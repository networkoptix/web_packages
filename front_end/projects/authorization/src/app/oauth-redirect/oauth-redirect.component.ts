import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router }    from '@angular/router';
import { LocalStorageService }       from 'ngx-webstorage';
import { UntilDestroy }              from '@ngneat/until-destroy';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxPageService }             from '@services/page.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { AuthorizeParams, ClientType } from '../components/authorize.component';
import { WINDOW } from '@services/window-provider';
import { deepCopy } from '@utils/general';

@UntilDestroy()
@Component({
    selector: 'oauth-redirect-component',
    templateUrl: './oauth-redirect.component.html',
    styleUrls: ['./oauth-redirect.component.scss']
})

export class NxOAuthRedirectComponent implements OnInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    initialData: AuthorizeParams;
    clientType: ClientType;
    viewType: 'desktop' | 'mobile' | 'web';
    state: 'sendingCode' | 'readyToLogin' | 'noNativeClient'

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;
    }

    constructor(configService: NxConfigService,
                private route: ActivatedRoute,
                private pageService: NxPageService,
                private language: NxLanguageProviderService,
                private router: Router,
                private localStorageService: LocalStorageService,
                @Inject(WINDOW) public window: Window
    ) {
        this.setupDefaults(configService);
    }

    ngOnInit(): void {
        // @ts-ignore
        if (this.window.nativeClient) {
            this.pageService.pageTitle = this.LANG.pageTitles.default?.();
            this.route.queryParams.subscribe(async(params: any) => {
                this.initialData = deepCopy(params);
                this.localStorageService.store('client_type', this.initialData.client_type);
                this.viewType = this.initialData.view_type || 'web';
                if (this.initialData.code) {
                    this.state = 'sendingCode';
                    this.localStorageService.clear('client_type');
                    // @ts-ignore
                    nativeClient.setCode(this.initialData.code);
                    setTimeout(() => { this.state = undefined; }, 3000);
                } else {
                    this.state = 'readyToLogin';
                }
            });
        } else {
            this.state = 'noNativeClient';
        }
    }

    redirectToOAuth() {
        // eslint-disable-next-line camelcase
        const { client_id, client_type, view_type } = this.initialData || {};
        // eslint-disable-next-line camelcase
        const redirect_url = '/redirect-oauth';
        this.router.navigate(['/'], {
            queryParams: {
                // eslint-disable-next-line camelcase
                client_id: client_id || 'desktop',
                // eslint-disable-next-line camelcase
                client_type: client_type || 'loginSystem',
                redirect_url,
                // eslint-disable-next-line camelcase
                view_type: view_type || 'desktop',
                response_type: 'code'
            }
        });
    }
}
