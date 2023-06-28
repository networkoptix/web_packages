import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxSimpleSearchComponent } from '@components/simple-search/simple-search.component';

import { NxMoreFiltersBaseModule } from '../more-filters-base/more-filters-base.module';

import { NxMoreTagsModalContent } from './more-tags.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        NxMoreFiltersBaseModule,
        NxSimpleSearchComponent,
    ],
    declarations: [NxMoreTagsModalContent],
    providers: [],
    exports: [NxMoreTagsModalContent],
})
export class NxMoreTagsModule {}
