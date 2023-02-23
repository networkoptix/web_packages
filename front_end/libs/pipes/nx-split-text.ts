import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { strSplice } from '@utils/general';

type extraParams = {
    length: number;
    translateParams: Record<string, string>;
};

/** A pipe to split text into chunks.
 * @param text Text to split
 * @param param Chunk length or object with chunk length and interpolation params
 * @param splitWith Text to insert at splits (default `<br/>`)
 * @returns Split text
 */
@Pipe({ name: 'translateAndSplitText' })
export class TextTransformPipe implements PipeTransform {
    constructor(private translate: TranslateService) {}

    transform(text: string, param: number | extraParams, splitWith: string = '<br/>'): string {
        let transformedText: string;
        let idx = 0;
        let length: number;

        if (typeof param === 'number') {
            length = param;
            transformedText = this.translate.instant(text);
        } else {
            length = param.length;
            transformedText = this.translate.instant(text, param.translateParams);
        }

        while (transformedText.slice(idx, idx + length).length === length) {
            const sub = transformedText.slice(idx, idx + length);
            const pos =
                transformedText.charAt(idx + sub.length) === ' '
                    ? sub.length
                    : sub.lastIndexOf(' ');
            const breakSpace = idx + pos;
            idx = breakSpace + splitWith.length;
            transformedText = strSplice(transformedText, breakSpace, splitWith);
        }

        return transformedText;
    }
}
