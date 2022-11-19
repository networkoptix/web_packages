import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxMoreFiltersBaseModalContent } from './more-filters-base.component';

@NgModule({
    imports: [
        CommonModule,
    ],
    declarations: [
        NxMoreFiltersBaseModalContent,
    ],
    providers: [],
    exports: [
        NxMoreFiltersBaseModalContent,
    ]
})
export class NxMoreFiltersBaseModule {}
