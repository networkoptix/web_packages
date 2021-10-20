import { waitForAsync, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSessionService } from '@services/session.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorageService } from 'ngx-webstorage';
import { NxUriCacheService } from '@services/uri-cache.service';
import { Router } from '@angular/router';
import { WINDOW } from '@services/window-provider';
import { of } from 'rxjs';

describe('Language provider service', () => {
    let langProvider: NxLanguageProviderService;
    const configMock = { getConfig: () => nxConfig };

    const localStorageMock = {
        observe: () => of()
    };

    const cloudApiMock = {
        getLanguage: () => of({ Cancel: 'Cancel' })
    };

    const cacheMock = {
        cachedData: new Map<string, any>()
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot(), HttpClientTestingModule],
            providers: [
                { provide: Router, useValue: {} },
                { provide: NxConfigService, useValue: configMock },
                { provide: LocalStorageService, useValue: localStorageMock },
                { provide: NxSessionService, useValue: {} },
                { provide: NxUriCacheService, useValue: cacheMock },
                { provide: NxCloudApiService, useValue: cloudApiMock },
                { provide: NxConfigService, useValue: configMock },
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
        langProvider.currentLang = 'en_US';
        tick(1); // making sure loadLanguage sets translations
        langProvider.translateSubject.subscribe(() => {
            // test call doesn't trigger pluralization so instead function we get a string
            expect(langProvider.translations['Cancel']).toBe('Cancel');
        });
    }));
});
