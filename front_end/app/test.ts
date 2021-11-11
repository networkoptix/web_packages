// This file is required by karma.conf.js and loads recursively all the .spec and framework files
import 'zone.js/dist/zone-testing';
import { getTestBed } from '@angular/core/testing';
import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { MockInstance, ngMocks } from 'ng-mocks';
import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, EMPTY, of, ReplaySubject } from 'rxjs';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import staticLang from '@app/language_compiled.json';
import { NxSessionService } from '@services/session.service';
import { TranslateService } from '@ngx-translate/core';
import { NxAccountService } from '@services/account.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxProcessService, Process } from '@services/process.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSettingsService } from '@pages/systems/settings/settings.service';

// HELPERS ******************************************
nxConfig.company.name = 'Nx Cloud';

const localStorageMockStore = {};

const parseStaticTranslations = (staticLangNode) => Object.entries(
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

// @ts-ignore
ngMocks.defaultMock(NxAccountService, () => ({
    get: () => of({
        can_publish_integration: false,
        name: 'Test',
        first_name: 'Test',
        isCloud: false,
        is_staff: false,
        language: 'en_US',
        last_name: '1234',
        permissions: [],
        is_superuser: false,
        id: 'test',
        email: 'test@test.com',
        is_authenticated: false,
        cookie_reviewed: true
    }).toPromise(),
    accountSubject: new BehaviorSubject(null)
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
    loginStateSubject: new ReplaySubject<string>(0)
}));

ngMocks.defaultMock(TranslateService, () => ({
    instant: (text) => text
}));

// @ts-ignore
ngMocks.defaultMock(NxProcessService, () => ({
    createProcess: () => Promise.resolve()
}));

// @ts-ignore
ngMocks.defaultMock(Process, () => ({
    run: () => {}
}));

ngMocks.defaultMock(NxScrollMechanicsService, () => ({
    windowSizeSubject: new BehaviorSubject({ height: 0, width: 0 })
}));

ngMocks.defaultMock(NxSettingsService, () => ({
    footerSubject: new BehaviorSubject(false),
    systemSubject: new BehaviorSubject<any>(false),
    selectedSectionSubject: new BehaviorSubject([])
}));

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
