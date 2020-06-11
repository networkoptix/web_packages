import { NgModule }         from '@angular/core';
import { NxSafePipe }       from './nx-safe';
import { NxHealthDatePipe } from './health-date';

@NgModule({
    imports : [],
    declarations: [
        NxHealthDatePipe,
        NxSafePipe
    ],
    entryComponents: [],
    exports        : [
        NxHealthDatePipe,
        NxSafePipe
    ],
    providers: [NxHealthDatePipe]
})
export class PipesModule {
}
