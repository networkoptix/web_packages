import { HttpClient } from '@angular/common/http';
import {
    waitForAsync,
    TestBed,
    fakeAsync,
    tick
} from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MockProvider } from 'ng-mocks';
import { LocalStorageService } from 'ngx-webstorage';
import { of } from 'rxjs';

import { NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSessionService } from '@services/session.service';
import { NxUriCacheService } from '@services/uri-cache.service';
import { WINDOW } from '@services/window-provider';

describe('Language provider service', () => {
    let langProvider: NxLanguageProviderService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                // default mocks are in test.ts
                MockProvider(NxUriCacheService),
                MockProvider(HttpClient),
                MockProvider(Router),
                MockProvider(NxSessionService),
                MockProvider(NxConfigService),
                MockProvider(LocalStorageService),
                { provide: WINDOW, useValue: window }
            ]
        });
        langProvider = TestBed.inject(NxLanguageProviderService);
    }));

    it('should create the service', () => {
        expect(langProvider).toBeTruthy();
    });

    it('should set translations', () => {
        langProvider.setTranslations('en_US', { Cancel: 'Cancel' });
        langProvider.translateSubject.subscribe(() => {
            // test call doesn't trigger pluralization so instead function we get a string
            expect(langProvider.translations['Cancel']).toBe('Cancel');
        });
    });

    it('should have setter and getter (defaultLanguage)', () => {
        langProvider.defaultLanguage = 'en_US';
        expect(langProvider.defaultLanguage).toBe('en_US');
    });

    it('should have setter and getter (currentLang)', fakeAsync(() => {
        spyOn(langProvider, 'loadLanguage')
            .and.returnValue(of({ Cancel: 'Cancel' }).toPromise());

        langProvider.currentLang = 'en_US';
        tick(); // making sure loadLanguage sets translations
        langProvider.translateSubject.subscribe(() => {
            // test call doesn't trigger pluralization so instead function we get a string
            expect(langProvider.translations['Cancel']).toBe('Cancel');
        });
    }));
});
