import { Injectable }             from '@angular/core';
import { TranslateService }       from '@ngx-translate/core';
import { ReplaySubject, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxLanguageProviderService {

    lang: any;
    translations: any;
    translationsSubject = new ReplaySubject();

    constructor(private translate: TranslateService) {
    }

    setLang(lang) {
        this.lang = lang;
        this.translate
            .use(lang)
            .subscribe((obj) => {
                this.translations = obj;
                this.translationsSubject.next(obj);
            });
    }

    getTranstalions() {
        return this.translations;
    }

    getLang() {
        return this.lang;
    }


    ngOnDestroy() {
        this.translationsSubject.unsubscribe();
    }
}
