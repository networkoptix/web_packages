import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router }    from '@angular/router';
import { LocalStorageService }       from 'ngx-webstorage';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxPageService }             from '@services/page.service';
import { NxUtilsService }            from '@services/utils.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { AuthorizeParams, ClientType } from '../components/authorize.component';
import { WINDOW } from '@services/window-provider';

/* eslint-disable camelcase */
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
                private deviceService: DeviceDetectorService,
                @Inject(WINDOW) public window: Window
    ) {
        this.setupDefaults(configService);
    }

    ngOnInit(): void {
        this.pageService.pageTitle = this.LANG.pageTitles.default?.();

        // @ts-ignore
        if (this.window.nativeClient) {
            this.route.queryParams.subscribe(async(params: any) => {
                this.initialData = params ? NxUtilsService.deepCopy(params) : {};
                const { client_type, code, view_type } = this.initialData;
                this.localStorageService.store('client_type', client_type);
                this.viewType = view_type || 'desktop';
                if (code) {
                    this.state = 'sendingCode';
                    this.localStorageService.clear('client_type');
                    if (client_type === 'system2faAuth') {
                        // @ts-ignore
                        nativeClient.twoFaVerified(code);
                    } else {
                        // @ts-ignore
                        nativeClient.setCode(code);
                    }
                    setTimeout(() => { this.state = undefined; }, 3000);
                } else {
                    this.state = 'readyToLogin';
                }
            });
        } else if (this.deviceService.isMobile()) {
            this.route.queryParams.subscribe(async(params: any) => {
                this.initialData = NxUtilsService.deepCopy(params);
                this.viewType = this.initialData.view_type || 'desktop';
                this.state = 'sendingCode';
            });
        } else {
            this.state = 'noNativeClient';
        }
    }

    redirectToOAuth() {
        const { client_id, client_type, view_type } = this.initialData || {};
        this.router.navigate(['/'], {
            queryParams: {
                client_id: client_id || this.deviceService.isMobile ? 'mobile' : 'desktop',
                client_type: client_type || 'loginSystem',
                redirect_url: '/redirect-oauth',
                view_type: view_type || 'desktop',
                response_type: 'code'
            }
        });
    }
}
