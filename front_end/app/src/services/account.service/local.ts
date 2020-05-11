import { BaseAccount }                                    from './base';
import { Exactly }                                        from '../../utils/utility-types';
import { Inject, Injector }                               from '@angular/core';
import { DOCUMENT, Location }                             from '@angular/common';
import { LocalStorageService }                            from 'ngx-store';
import { Router }                                         from '@angular/router';
import { NxConfigService }                                from '../nx-config';
import { NxCloudApiService }                              from '../nx-cloud-api';
import { NxLanguageProviderService }                      from '../nx-language-provider';
import { NxSessionService }                               from '../session.service';
import { WINDOW }                                         from '../window-provider';
import { NxAppStateService }                              from '../nx-app-state.service';
import { NxUriService }                                   from '../uri.service';
import { NxPollService }                                  from '../poll.service';
import { NxSystemAPI, NxSystemAPIService }                from '../system-api.service';
import { Account }                                        from './account';

/**
 * LocalAcount overrides BaseAccount, should maintain the same interface.
 * This is enforced using the Exactly<BaseAccount, LocalAccount> type.
 */
export class LocalAccount extends BaseAccount implements Exactly<BaseAccount, LocalAccount> {
    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        locationService: Location,
        @Inject(DOCUMENT) protected document: Document,
        @Inject(WINDOW) protected window: Window,
        protected cloudApi: NxCloudApiService,
        protected sessionService: NxSessionService,
        protected uriService: NxUriService,
        protected localStorageService: LocalStorageService,
        protected router: Router,
        protected appStateService: NxAppStateService,
        protected pollService: NxPollService,
        injector: Injector,
        protected nxSystemAPIService: NxSystemAPIService,
    ) {
        super(
            configService,
            languageService,
            locationService,
            document,
            window,
            cloudApi,
            sessionService,
            uriService,
            localStorageService,
            router,
            appStateService,
            pollService,
            injector,
            nxSystemAPIService
        );
    }

    async get(forceUpdate = false) {
        const { reply: user } = await this.mediaServerApi.getCurrentUser();
        return new Account(user);
    }

    login(login, password, remember = false) {
        return this.mediaServerApi.login(login, password);
    }

    logout(doNotRedirect = false) {
        this.account = undefined;

        if (this.loggingOut) {
            return;
        }

        this.applyService
            .canMove()
            .then((allowed: boolean) => {
                if (allowed) {
                    this.loggingOut = true;
                    this.logoutHelper(doNotRedirect);
                }
            });
    }

    logoutHelper(doNotRedirect = false) {
        this.mediaServerApi
            .logout()
            .finally(() => {
                this.sessionService.invalidateSession(); // Clear session
                if (!doNotRedirect) {
                    this.router
                        .navigate([this.CONFIG.redirect.unauthorised])
                        .finally(() => {
                            setTimeout(() => this.window.location.reload());
                        });
                }

                setTimeout(() => {
                    this.window.location.reload();
                });
            });
    }
}
