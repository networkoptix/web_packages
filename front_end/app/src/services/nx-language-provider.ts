import { Injectable }              from '@angular/core';
import { TranslateService }        from '@ngx-translate/core';
import { LanguageI18NStaticTypes } from '../../language_i18n_static_types';

@Injectable({
    providedIn: 'root'
})
export class NxLanguageProviderService {
    LANG: LanguageI18NStaticTypes;
    translations: any;

    constructor(
        private translate: TranslateService) {
    }

    setDefaultLang(lang: string): void {
        this.translate.setDefaultLang(lang);
    }

    setTranslations(lang: string, json: JSON): void {
        this.translate.setTranslation(lang, json);
        this.translate.currentLang = lang;
    }

    getTranslations(): LanguageI18NStaticTypes {
        return this.translate.translations[this.translate.currentLang];
    }

    getLang(): string {
        return this.translate.currentLang;
    }
}
