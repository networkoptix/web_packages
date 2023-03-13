import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';

import { AddPartnerBrandModalContent } from './add-brand.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule.forRoot(),
        TranslateModule,

        NxGenericDropdownModule,
    ],
    declarations: [
        AddPartnerBrandModalContent,
    ],
    providers: [],
    exports: [
        AddPartnerBrandModalContent,
    ]
})
export class AddPartnerBrandModalModule {}
