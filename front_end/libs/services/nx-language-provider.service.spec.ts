import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MockProvider } from 'ng-mocks';
import { LocalStorageService } from 'ngx-webstorage';
import { firstValueFrom, of } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxCloudApiService } from './nx-cloud-api';
import { NxSwCacheService } from './sw-cache.service';
import { NxToastService } from './toast.service';
import { NxUriCacheService } from './uri-cache.service';

vi.mock('./nx-cloud-api', () => ({
    NxCloudApiService: {},
}));

class MockLocalStorage extends Map {
    retrieve(key: string): unknown {
        return super.get(key);
    }
    store(key: string, value: unknown): void {
        super.set(key, value);
    }
    observe(key: string): unknown {
        return of(super.get(key));
    }
}

const setupLangProvider = async (): Promise<NxLanguageProviderService> => {
    TestBed.configureTestingModule({
        imports: [TranslateModule.forRoot()],
        providers: [
            MockProvider(NxCloudApiService, {}),
            MockProvider(NxToastService),
            { provide: LocalStorageService, useClass: MockLocalStorage },
            MockProvider(NxUriCacheService),
            MockProvider(NxSwCacheService),
        ],
    });
    return TestBed.inject(NxLanguageProviderService);
};

describe('Language provider service', () => {
    it('should create the service', async () => {
        const langProvider = await setupLangProvider();
        expect(langProvider).toBeTruthy();
    });

    it('should set translations', async () => {
        const langProvider = await setupLangProvider();
        const lang = 'en_US';
        langProvider.setTranslations(lang, { Cancel: 'Cancel' });
        expect(langProvider.translate.translations[lang]['Cancel']).toBe('Cancel');
    });

    it('should have setter and getter (defaultLanguage)', async () => {
        const langProvider = await setupLangProvider();
        langProvider.defaultLanguage = 'en_US';
        expect(langProvider.defaultLanguage).toBe('en_US');
    });

    it('should have setter and getter (currentLang)', async () => {
        const langProvider = await setupLangProvider();
        vi.spyOn(langProvider, 'loadLanguage').mockImplementation(() =>
            firstValueFrom(of({ Cancel: 'Cancel' })),
        );
        const clearUriCache = vi
            .spyOn(langProvider.cacheService, 'clearData')
            .mockImplementation(() => {});
        const clearAllCache = vi
            .spyOn(langProvider.swCacheService, 'clearAllCache')
            .mockImplementation(() => Promise.resolve([]));
        const translation = { [uuid()]: uuid() };
        const loadLanguage = vi
            .spyOn(langProvider, 'loadLanguage')
            .mockImplementation(() => Promise.resolve(translation));
        const lang = uuid();
        langProvider.currentLang = lang;
        expect(langProvider.translate.currentLang).toBe(lang);
        expect(loadLanguage).toHaveBeenCalled();
        expect(clearUriCache).toBeCalled();
        expect(clearAllCache).toHaveBeenCalled();
    });
});
