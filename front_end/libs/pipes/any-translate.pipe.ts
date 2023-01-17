import {
    ChangeDetectorRef,
    Pipe,
    PipeTransform
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Translatable } from './any-translate.types';

/** A pipe to split text into chunks.
 * @param text Text or object ot translate
 * @param param Interpolation params
 * @returns Translated text
 */
@Pipe({ name: 'translate', pure: false })
export class AnyTranslatePipe extends TranslatePipe implements PipeTransform {
    constructor(
        translate: TranslateService, _ref: ChangeDetectorRef
    ) {
        super(translate, _ref);
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    transform(
        text: Translatable,
        param?: any
    ): string {
        const value = text?.value || text;
        const params = Object.assign({}, text?.params, param);
        return super.transform(value, Object.entries(params).reduce((params, [param, paramValue]) => ({ ...params, [param]: this.transform(paramValue) }), {}));
    }
}
