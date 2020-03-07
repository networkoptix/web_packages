import { Injectable }             from '@angular/core';
import { TranslateService }       from '@ngx-translate/core';
import { ReplaySubject, Subject } from 'rxjs';
import { LanguageI18NStaticTypes } from '../../language_i18n_static_types';

@Injectable({
    providedIn : 'root'
})
export class NxLanguageProviderService {
    LANG: LanguageI18NStaticTypes;
    translations: any;
    // translationsSubject = new ReplaySubject();

    constructor(private translate: TranslateService) {
    }

    setDefaultLang(lang: string): void {
        this.translate.setDefaultLang(lang);
    }

    setTranslations(lang, json): void {
        this.translate.setTranslation(lang, json);
        this.translate.currentLang = lang;
    }

    getTranslations(): LanguageI18NStaticTypes {
        return this.translate.translations[this.translate.currentLang];
    }

    getLang(): string {
        return this.translate.currentLang;
    }

    ngOnDestroy(): void {
        // this.translationsSubject.unsubscribe();
    }
}
