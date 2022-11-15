import { NgModule } from '@angular/core';

import { AnyTranslatePipe } from './any-translate.pipe';
import { AsPipe } from './as';
import { EscapeHtmlPipe } from './escape-html';
import { NxHealthDatePipe } from './health-date';
import { NxSafePipe } from './nx-safe';
import { TextTransformPipe } from './nx-split-text';

@NgModule({
    imports: [
    ],
    declarations: [
        AnyTranslatePipe,
        NxHealthDatePipe,
        NxSafePipe,
        TextTransformPipe,
        AsPipe,
        EscapeHtmlPipe,
    ],
    exports: [
        AnyTranslatePipe,
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
