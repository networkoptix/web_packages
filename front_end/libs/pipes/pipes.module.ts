import { NgModule } from '@angular/core';

import { AsPipe } from './as';
import { EscapeHtmlPipe } from './escape-html';
import { NxHealthDatePipe } from './health-date';
import { ObjectsMergePipe } from './nx-objects-merge';
import { NxSafePipe } from './nx-safe';
import { TextTransformPipe } from './nx-split-text';
import { NxTranslatePipe } from './nx-translate.pipe';

@NgModule({
    imports: [],
    declarations: [
        AsPipe,
        EscapeHtmlPipe,
        NxHealthDatePipe,
        NxSafePipe,
        NxTranslatePipe,
        ObjectsMergePipe,
        TextTransformPipe,
    ],
    exports: [
        AsPipe,
        EscapeHtmlPipe,
        NxHealthDatePipe,
        NxSafePipe,
        NxTranslatePipe,
        ObjectsMergePipe,
        TextTransformPipe,
    ],
    providers: [NxHealthDatePipe],
})
export class PipesModule {}
