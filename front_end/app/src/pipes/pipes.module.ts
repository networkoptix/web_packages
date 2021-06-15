import { NgModule }         from '@angular/core';
import { NxSafePipe }       from './nx-safe';
import { NxUnsafePipe }     from './nx-unsafe';
import { NxHealthDatePipe } from './health-date';

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
