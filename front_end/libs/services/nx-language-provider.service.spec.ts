import { firstValueFrom, of } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { NxLanguageProviderService } from '@services/nx-language-provider';

import { setupTestBed } from './src/setup';

const setupLangProvider = async (): Promise<NxLanguageProviderService> => {
    const { inject } = await setupTestBed();
    return inject(NxLanguageProviderService);
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
        expect(langProvider.translate.translations[lang]['Cancel']()).toBe('Cancel');
    });

    it('should have setter and getter (defaultLanguage)', async () => {
        const langProvider = await setupLangProvider();
        langProvider.defaultLanguage = 'en_US';
        expect(langProvider.defaultLanguage).toBe('en_US');
    });

    it('should have setter and getter (currentLang)', async () => {
        const langProvider = await setupLangProvider();
        jest.spyOn(langProvider, 'loadLanguage').mockImplementation(() =>
            firstValueFrom(of({ Cancel: 'Cancel' })),
        );
        const clearUriCache = jest
            .spyOn(langProvider.cacheService, 'clearData')
            .mockImplementation(() => {});
        const clearAllCache = jest
            .spyOn(langProvider.swCacheService, 'clearAllCache')
            .mockImplementation(() => Promise.resolve([]));
        const translation = { [uuid()]: uuid() };
        const loadLanguage = jest
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
