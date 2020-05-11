import { BaseAccount }                  from './base';
import { Exactly }                      from '../../utils/utility-types';
import { Inject, Injectable, Injector } from '@angular/core';
import { DOCUMENT, Location }           from '@angular/common';
import { LocalStorageService }          from 'ngx-store';
import { Router }                       from '@angular/router';
import { NxConfigService }              from '../nx-config';
import { NxCloudApiService }            from '../nx-cloud-api';
import { NxLanguageProviderService }    from '../nx-language-provider';
import { NxSessionService }             from '../session.service';
import { WINDOW }                       from '../window-provider';
import { NxAppStateService }            from '../nx-app-state.service';
import { NxUriService }                 from '../uri.service';
import { NxPollService }                from '../poll.service';

/**
 * CloudAcount over-rides BaseAccount, should maintain the same interface.
 */
@Injectable()
export class CloudAccount extends BaseAccount implements Exactly<BaseAccount, CloudAccount> {
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
        injector: Injector
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
            injector
        );
    }

    serviceInstance() {
        return 'is cloud';
    }
}
