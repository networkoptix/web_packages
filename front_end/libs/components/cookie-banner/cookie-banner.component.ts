import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { LetDirective } from '@ngrx/component';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import { LocalStorageService } from 'ngx-webstorage';
import { firstValueFrom, tap } from 'rxjs';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import * as staticLang from '@language_static';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { AgreementInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { icons, apiBase } from '@static-variables';
import { accountSelectors } from '@store/account';

@UntilDestroy()
@Component({
    selector: 'nx-cookie-banner',
    templateUrl: './cookie-banner.component.html',
    styleUrls: ['./cookie-banner.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,

        AngularSvgIconModule,
        NgxTranslateCutModule,
        LetDirective,
        TranslateModule,

        NxAddSvgSrcDirective,
    ],
})
export class NxCookieBannerComponent implements OnInit {
    CONFIG: IConfig;
    LANG = staticLang;
    cookieBannerReviewed: boolean = false;
    cookiePolicyExists: boolean = false;
    cookiePolicyInfo: AgreementInfo;
    loggedIn = false;
    icons = icons;
    readonly apiBase: string = apiBase;
    readonly cookiePolicyURL = 'cookie-policy';

    constructor(
        private localStorage: LocalStorageService,
        private cloudApiService: NxCloudApiService,
        private store: Store,
        configService: NxConfigService,
    ) {
        this.CONFIG = configService.config;
        this.store
            .select(accountSelectors.selectIsAuthenticated)
            .pipe(
                tap(isAuthenticated => {
                    this.loggedIn = !!isAuthenticated;
                    this.checkCookiePolicyExists(!!isAuthenticated);
                }),
            )
            .subscribe();
    }
    ngOnInit(): void {
        this.cookieBannerReviewed = this.localStorage.retrieve('cookiereviewed') === true;
    }

    async checkCookiePolicyExists(isAuthenticated: boolean): Promise<void> {
        firstValueFrom(this.cloudApiService.fetchCookiePolicy()).then(value => {
            if (value) {
                this.cookiePolicyInfo = value;
                this.cookiePolicyExists = true;
                if (value.accepted) {
                    this.localStorage.store('cookiereviewed', true);
                    this.cookieBannerReviewed = true;
                } else {
                    // Shows the cookie banner if you are authenticated and have not accepted the cookie policy
                    // Keeps the cookie banner hidden if you are unauthenticated and have closed the cookie banner before
                    if (isAuthenticated) {
                        this.localStorage.clear('cookiereviewed');
                        this.cookieBannerReviewed = false;
                    }
                }
            }
        });
    }

    async onCookieBannerClose(): Promise<void> {
        this.localStorage.store('cookiereviewed', true);
        this.cookieBannerReviewed = true;
        if (this.loggedIn) {
            await this.cloudApiService.acceptAgreement(this.cookiePolicyInfo.review_id);
        }
    }
}
