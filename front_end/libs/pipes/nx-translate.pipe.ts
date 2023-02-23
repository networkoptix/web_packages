import { ChangeDetectorRef, Pipe, PipeTransform } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import type { SingleTranslateObject, Translatable, TranslateObject } from './nx-translate.types';

function isSingleTranslate(
    obj: TranslateObject | SingleTranslateObject,
): obj is SingleTranslateObject {
    return Object.values(obj.params).every(p => typeof p === 'string');
}

/** TranslatePipe with added ways to pass arguments.
 * @param value Text or object with translation args
 * @returns Translated text
 */
@Pipe({ name: 'nxTranslate', pure: false })
export class NxTranslatePipe extends TranslatePipe implements PipeTransform {
    constructor(translate: TranslateService, _ref: ChangeDetectorRef) {
        super(translate, _ref);
    }

    transform(translatable: Translatable): string {
        if (typeof translatable === 'string') {
            return super.transform(translatable);
        } else if (!translatable.params || !Object.keys(translatable.params).length) {
            return super.transform(translatable.value);
        } else if (isSingleTranslate(translatable)) {
            return super.transform(translatable.value, translatable.params);
        } else {
            return super.transform(
                translatable.value,
                Object.entries(translatable.params).reduce(
                    (params, [param, paramValue]) => ({
                        ...params,
                        [param]: this.transform(paramValue),
                    }),
                    {},
                ),
            );
        }
    }
}
