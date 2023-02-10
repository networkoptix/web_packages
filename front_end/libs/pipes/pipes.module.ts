import { NgModule } from '@angular/core';

import { AsPipe } from './as';
import { EscapeHtmlPipe } from './escape-html';
import { NxHealthDatePipe } from './health-date';
import { NxSafePipe } from './nx-safe';
import { TextTransformPipe } from './nx-split-text';
import { NxTranslatePipe } from './nx-translate.pipe';

@NgModule({
    imports: [
    ],
    declarations: [
        NxTranslatePipe,
        NxHealthDatePipe,
        NxSafePipe,
        TextTransformPipe,
        AsPipe,
        EscapeHtmlPipe,
    ],
    exports: [
        NxTranslatePipe,
        NxHealthDatePipe,
        NxSafePipe,
        TextTransformPipe,
        AsPipe,
        EscapeHtmlPipe,
    ],
    providers: [NxHealthDatePipe]
})
export class PipesModule {
}
