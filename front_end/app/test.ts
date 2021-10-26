// This file is required by karma.conf.js and loads recursively all the .spec and framework files
import 'zone.js/dist/zone-testing';
import { getTestBed }                from '@angular/core/testing';
import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting
}                                    from '@angular/platform-browser-dynamic/testing';
import { MockInstance, ngMocks }     from 'ng-mocks';
import { NxConfigService }           from '@services/nx-config';
import { nxConfig }                  from '@services/nx-config/config';
import { LocalStorageService }       from 'ngx-webstorage';
import { BehaviorSubject, EMPTY }    from 'rxjs';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import staticLang                    from '@app/language_compiled.json';

// HELPERS ******************************************
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
    getConfig: () => nxConfig
}));

ngMocks.defaultMock(NxLanguageProviderService, () => ({
    translations: parseStaticTranslations(staticLang),
    translateSubject: new BehaviorSubject(null)
}));

ngMocks.defaultMock(LocalStorageService, () => ({
    observe: () => EMPTY
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
