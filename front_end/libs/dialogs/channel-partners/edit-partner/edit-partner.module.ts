import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { NxEditPartnerModalContent } from './edit-partner.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule.forRoot(),
        TranslateModule,

        NxGenericDropdownModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [
        NxEditPartnerModalContent,
    ],
    providers: [],
    exports: [
        NxEditPartnerModalContent,
    ]
})
export class NxEditPartnerModalModule {}
