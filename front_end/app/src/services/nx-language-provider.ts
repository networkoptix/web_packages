import { Injectable }              from '@angular/core';
import { TranslateService }        from '@ngx-translate/core';
import { LanguageI18NStaticTypes } from '../../language_i18n_static_types';
import { BehaviorSubject }         from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxLanguageProviderService {
    LANG: LanguageI18NStaticTypes;
    translateSubject = new BehaviorSubject({});

    constructor(private translate: TranslateService) {}

    public get currentLanguage(): string {
        return this.translate.currentLang;
    }

    public get translations(): LanguageI18NStaticTypes {
        return this.translate.translations[this.translate.currentLang];
    }

    public set newTranslation(translate: { language: string, json: JSON }) {
        this.translate.setTranslation(translate.language, translate.json);
        this.translate.currentLang = translate.language;

        this.translateSubject.next(this.translate.translations[this.translate.currentLang]);
    }

    public set defaultLanguage(language: string) {
        this.translate.setDefaultLang(language);
    }
}
