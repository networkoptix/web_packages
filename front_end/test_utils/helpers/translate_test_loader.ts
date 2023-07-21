import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import compiledLang from '@common/language/language_i18n.json';

export class TranslateTestLoader extends TranslateLoader {
    constructor() {
        super();
    }
    getTranslation(_lang: string): Observable<Record<string, string>> {
        return of(compiledLang);
    }
}
