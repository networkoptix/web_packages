import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { MultiSelectModule } from '@components/dropdowns/multi-select/multi-select.module';
import { TagModule } from '@components/tag/tag.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxSearchComponent } from './search.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        MultiSelectModule,
        NxGenericDropdownModule,
        PipesModule,
        TagModule,
    ],
    declarations: [NxSearchComponent],
    providers: [NxSearchComponent],
    exports: [NxSearchComponent],
})
export class SearchModule {}
