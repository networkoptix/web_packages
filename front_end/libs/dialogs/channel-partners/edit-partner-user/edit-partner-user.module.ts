import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { NxEditPartnerUserModalContent } from './edit-partner-user.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        NxGenericDropdownModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [
        NxEditPartnerUserModalContent,
    ],
    providers: [],
    exports: [
        NxEditPartnerUserModalContent,
    ]
})
export class NxEditPartnerUserModalModule {}
