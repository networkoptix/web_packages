import { Injectable }              from '@angular/core';
import { HttpClient }              from '@angular/common/http';
import { TranslateService }        from '@ngx-translate/core';
import { BehaviorSubject }         from 'rxjs';

import { environment }              from '../../environments/environment';
import { NxCloudApiService }       from './nx-cloud-api';
import { LanguageI18NStaticTypes } from '../../language_i18n_static_types';
import { NxSessionService } from './session.service';

interface IParams<Value = any> {
    [key: string]: Value;
}

@Injectable({
    providedIn: 'root'
})
export class NxLanguageProviderService {
    LANG: LanguageI18NStaticTypes;
    translateSubject = new BehaviorSubject({});

    constructor(private translate: TranslateService,
        private http: HttpClient,
        private cloudApiService: NxCloudApiService,
        private sessionService: NxSessionService
    ) {
        if (environment.isLocal) {
            this.currentLang = this.sessionService.language;
        }
    }

    /**
     * Use to incrementally add params to a string to be translated.
     *
     * The method accepts the string to be translated as a param.
     *
     * Returns an translationObject with addParams and toString methods.
     *
     * The addParams method adds an object with params to be added and returns the translationObject
     * so that it can be chained.
     *
     * The getString method returns the translated string with the params.
     *
     * @param toTranslate - Language string to translate
     */
    static incrementalTranslate(toTranslate) {
        const params = {};
        const translationObject = {
            addParams: (paramsToAdd: IParams) => {
                Object.assign(params, paramsToAdd);
                return translationObject;
            },
            getString: () => toTranslate(params)
        };
        return translationObject;
    }

    static translate(toTranslate: any, translateParams = {}) {
        return toTranslate(translateParams);
    }

    loadLanguage() {
        const lang = this.translate.currentLang ?? this.translate.getDefaultLang();
        return (environment.isLocal
            ? this.http.get(`/static/lang_${lang}/language_compiled.json`)
            : this.cloudApiService.getLanguage()).toPromise();
    }

    setTranslations(lang: string, json: JSON): void {
        this.translate.setTranslation(lang, json);
        this.translate.currentLang = lang;

        this.translateSubject.next(this.translate.translations[this.translate.currentLang]);
    }

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

    public set currentLang(language: string) {
        this.translate.currentLang = language;
        this.sessionService.language = language;
    }
}
