import { BaseAccount } from './base';
import { Exactly } from '../../utils/utility-types';
import { Inject, Injector }        from '@angular/core';
import { DOCUMENT, Location }                             from '@angular/common';
import { LocalStorageService }                            from 'ngx-store';
import { Router }                                         from '@angular/router';
import { NxConfigService }                       from '../nx-config';
import { NxCloudApiService }                              from '../nx-cloud-api';
import { NxLanguageProviderService }                      from '../nx-language-provider';
import { NxSessionService }                               from '../session.service';
import { WINDOW }                                         from '../window-provider';
import { NxAppStateService }                              from '../nx-app-state.service';
import { NxUriService }                                   from '../uri.service';
import { NxPollService }                                  from '../poll.service';
import { NxSystemAPI, NxSystemAPIService } from '../system-api.service';
import { Account } from './account';

/**
 * LocalAcount and CloudAccount overrides BaseAccount, should maintain the same interface.
 */
export class LocalAccount extends BaseAccount implements Exactly<BaseAccount, LocalAccount> {
    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        locationService: Location,
        @Inject(DOCUMENT) protected document: Document,
        @Inject(WINDOW) protected window: Window,
        protected cloudApi: NxCloudApiService, // Maybe create a version of this service that works with webadmin
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

    get(forceUpdate = false) {
        return this.mediaServerApi.getCurrentUser().then(({ reply: user }) => new Account(user));
    }

    login(login, password, remember = false) {
        // @ts-ignore Need to add login method to media server and transform
        // return type from NormalResponse<User> to NormalResponse<Account>
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
            // @ts-ignore Need to add login method to media server
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

    // This can probably work without modifications with the shadowed get method on LocalAccount
    // redirectAuthorised() {}

    serviceInstance() {
        return 'is local';
    }
};
