import {
    Pipe,
    PipeTransform
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type extraParams = {
    length: number,
    translateParams: {}
};

@Pipe({ name: 'translateAndSplitText' })
export class TextTransformPipe implements PipeTransform {
    constructor(
        private translate : TranslateService
    ) {
    }

    replaceAt = (text, index, replacement): string => {
        return text.substr(0, index) + replacement + text.substr(index + 1);
    };

    transform(text: string, param: number | extraParams, splitWith: string = '<br/>'): string {
        let transformedText;
        let idx = 0;
        let length;

        if (typeof param === 'number') {
            length = param;
            transformedText = this.translate.instant(text);
        } else {
            length = param.length;
            transformedText = this.translate.instant(text, param.translateParams);
        }

        while (transformedText.substr(idx, length).length === length) {
            const sub = transformedText.substr(idx, length);
            const pos = transformedText.charAt(idx + sub.length) === ' ' ? sub.length : sub.lastIndexOf(' ');
            const breakSpace = idx + pos;
            idx = breakSpace + splitWith.length;
            transformedText = this.replaceAt(transformedText, breakSpace, splitWith);
        }

        return transformedText;
    }
}
