import { NgModule } from '@angular/core';

import { NxHealthDatePipe } from './health-date';
import { NxSafePipe } from './nx-safe';
import { TextTransformPipe } from './nx-split-text';
import { NxUnsafePipe } from './nx-unsafe';

@NgModule({
    imports: [
    ],
    declarations: [
        NxHealthDatePipe,
        NxSafePipe,
        NxUnsafePipe,
        TextTransformPipe,
    ],
    exports: [
        NxHealthDatePipe,
        NxSafePipe,
        NxUnsafePipe,
        TextTransformPipe,
    ],
    providers: [NxHealthDatePipe]
})
export class PipesModule {
}
