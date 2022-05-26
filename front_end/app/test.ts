// This file is required by karma.conf.js and loads recursively all the .spec and framework files
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { TranslateService } from '@ngx-translate/core';
import { MockInstance, ngMocks } from 'ng-mocks';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, EMPTY, of } from 'rxjs';

import staticLang from '@app/language_compiled.json';
import { NxSettingsService } from '@pages/systems/settings/settings.service';
import { NxAccountService } from '@services/account.service';
import { DUMMY_ACCOUNT } from '@services/account.service/account';
import type { Account } from '@services/account.service/account';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSessionService } from '@services/session.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { WINDOW } from '@services/window-provider';

// HELPERS ******************************************
nxConfig.company.name = 'Nx Cloud';

const localStorageMockStore = {};

const parseStaticTranslations = staticLangNode => Object.entries(
    staticLangNode
).reduce((
    parsed, [key, value]
) => ({
    ...parsed,
    [key]: typeof value === 'string'
        ? () => value
        : parseStaticTranslations(value)
}), {});
// **************************************************

// auto spy
ngMocks.autoSpy('jasmine');

// auto restore for jasmine
jasmine.getEnv().addReporter({
    specDone: MockInstance.restore,
    specStarted: MockInstance.remember,
    suiteDone: MockInstance.restore,
    suiteStarted: MockInstance.remember
});

ngMocks.defaultMock(NxConfigService, () => ({
    getConfig: () => nxConfig,
    flagsEnabled: () => false
}));

ngMocks.defaultMock(NxLanguageProviderService, () => ({
    translations: parseStaticTranslations(staticLang),
    translateSubject: new BehaviorSubject(null)
}));

ngMocks.defaultMock(NxCloudApiService, () => ({
    getCommonPasswords: () => of({ test1234: 1, 12345678: 1 })
}));

ngMocks.defaultMock(NxAccountService, () => ({
    get: () => of<Account>(DUMMY_ACCOUNT).toPromise(),
    accountSubject: new BehaviorSubject<Account>(DUMMY_ACCOUNT),
    account: DUMMY_ACCOUNT,
}));

ngMocks.defaultMock(LocalStorageService, () => ({
    observe: () => EMPTY,
    retrieve: (key: string) => !!localStorageMockStore[key],
    store: (key: string) => {
        localStorageMockStore[key] = true;
    }
}));

ngMocks.defaultMock(NxAppStateService, () => ({
    footerVisibleSubject: new BehaviorSubject(true),
    systemAvailable$: new BehaviorSubject(true),
    lastErrorStatus$: new BehaviorSubject(undefined)
}));

ngMocks.defaultMock(NxSessionService, () => ({
    loginStateSubject: new BehaviorSubject<string>(undefined)
}));

ngMocks.defaultMock(TranslateService, () => ({
    instant: text => text
}));

// @ts-expect-error
ngMocks.defaultMock(NxProcessService, () => ({
    createProcess: () => Promise.resolve()
}));

// @ts-expect-error
ngMocks.defaultMock(Process, () => ({
    run: () => {}
}));

ngMocks.defaultMock(NxScrollMechanicsService, () => ({
    windowSizeSubject: new BehaviorSubject({ height: 0, width: 0 })
}));

ngMocks.defaultMock(NxSettingsService, () => ({
    systemSubject: new BehaviorSubject<NxSystem>(undefined),
}));

// @ts-expect-error
ngMocks.defaultMock(NxSystemsService, () => ({
    systemsSubject: of([]),
}));

ngMocks.defaultMock(WINDOW, () => window);

declare const require: {
  context(path: string, deep?: boolean, filter?: RegExp): {
    keys(): string[];
    <T>(id: string): T;
  };
};

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting()
);
// Then we find all the tests.
const context = require.context('./', true, /\.spec\.ts$/);
// And load the modules.
context.keys().map(context);
