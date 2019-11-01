import { NgModule } from '@angular/core';

import { NxUrlSafePipe }       from './nx-url-safe';

@NgModule({
    imports        : [],
    declarations   : [
        NxUrlSafePipe,
    ],
    entryComponents: [],
    exports        : [
        NxUrlSafePipe
    ]
})
export class PipesModule {
}