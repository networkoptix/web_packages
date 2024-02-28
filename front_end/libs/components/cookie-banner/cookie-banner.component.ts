import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { LetDirective } from '@ngrx/component';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import { LocalStorageService } from 'ngx-webstorage';
import { firstValueFrom } from 'rxjs';
import { first } from 'rxjs/operators';

import { accountActions, accountSelectors } from '@common/store/account';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import * as staticLang from '@language_static';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { icons, apiBase } from '@static-variables';

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
    icons = icons;
    readonly apiBase: string = apiBase;
    readonly cookiePolicyURL = 'cookie-policy';

    constructor(
        private localStorage: LocalStorageService,
        private store: Store,
        private cloudApiService: NxCloudApiService,
        configService: NxConfigService,
    ) {
        this.CONFIG = configService.config;
        this.checkCookiePolicyExists();
    }
    ngOnInit(): void {
        this.cookieBannerReviewed = this.localStorage.retrieve('cookiereviewed') === true;
        this.store
            .select(accountSelectors.selectCurrentUser)
            .pipe(
                first(value => value !== undefined),
                untilDestroyed(this),
            )
            .subscribe(account => {
                if (account) {
                    if (account.cookie_reviewed) {
                        this.localStorage.store('cookiereviewed', true);
                        this.cookieBannerReviewed = true;
                    }
                    // Doesn't work properly yet, also might not be desirable, so commented out for now
                    // Also, shouldn't show for environment.isLocal === true && appStateService.authorizing === true
                    // } else {
                    //     // If a new account logs in and their cookie_reviewed is false, show banner
                    //     this.localStorage.store('cookiereviewed', false);
                    //     this.cookieBannerReviewed = false;
                    // }
                }
            });
    }

    async checkCookiePolicyExists(): Promise<void> {
        firstValueFrom(this.cloudApiService.getArticle(this.cookiePolicyURL)).then(() => {
            this.cookiePolicyExists = true;
        });
    }

    async onCookieBannerClose(): Promise<void> {
        this.localStorage.store('cookiereviewed', true);
        this.cookieBannerReviewed = true;
        const reviewCookie = await this.cloudApiService.reviewCookie();
        if (reviewCookie.resultCode === 'ok') {
            this.store.dispatch(
                accountActions.updateCurrentUser({
                    update: { cookie_reviewed: true },
                }),
            );
        }
    }
}
