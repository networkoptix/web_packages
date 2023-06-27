import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxSimpleSearchModule } from '@components/simple-search/simple-search.module';

import { NxMoreFiltersBaseModule } from '../more-filters-base/more-filters-base.module';

import { NxMoreDevicesModalContent } from './more-devices.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        NxMoreFiltersBaseModule,
        NxCheckboxComponent,
        NxSimpleSearchModule,
    ],
    declarations: [NxMoreDevicesModalContent],
    providers: [],
    exports: [NxMoreDevicesModalContent],
})
export class NxMoreDevicesModule {}
