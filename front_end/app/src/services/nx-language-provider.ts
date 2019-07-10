import { Injectable }                      from '@angular/core';
import { downgradeInjectable }             from '@angular/upgrade/static';
import { TranslateService }                from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxLanguageProviderService {

    lang: any;
    translationsSubject = new BehaviorSubject({});

    constructor(private translate: TranslateService) {
    }

    setLang(lang) {
        this.lang = lang;
        this.translate
            .use(lang)
            .subscribe((obj) => {
                this.translationsSubject.next(obj);
            });
    }

    getLang() {
        return this.lang;
    }


    ngOnDestroy() {
        this.translationsSubject.unsubscribe();
    }
}
