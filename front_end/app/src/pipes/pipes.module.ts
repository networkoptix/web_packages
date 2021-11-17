import { NgModule } from '@angular/core';

import { NxHealthDatePipe } from './health-date';
import { NxSafePipe } from './nx-safe';
import { NxUnsafePipe } from './nx-unsafe';

@NgModule({
    imports: [
    ],
    declarations: [
        NxHealthDatePipe,
        NxSafePipe,
        NxUnsafePipe
    ],
    exports: [
        NxHealthDatePipe,
        NxSafePipe,
        NxUnsafePipe
    ],
    providers: [NxHealthDatePipe]
})
export class PipesModule {
}
