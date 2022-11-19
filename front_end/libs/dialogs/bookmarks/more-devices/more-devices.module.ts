import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { NxSimpleSearchModule } from '@components/simple-search/simple-search.module';

import { NxMoreFiltersBaseModule } from '../more-filters-base/more-filters-base.module';

import { NxMoreDevicesModalContent } from './more-devices.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule.forRoot(),
        TranslateModule,

        NxMoreFiltersBaseModule,
        CheckboxModule,
        NxSimpleSearchModule,
    ],
    declarations: [
        NxMoreDevicesModalContent,
    ],
    providers: [],
    exports: [
        NxMoreDevicesModalContent,
    ]
})
export class NxMoreDevicesModule {}
