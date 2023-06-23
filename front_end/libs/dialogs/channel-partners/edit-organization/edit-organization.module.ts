import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { NxEditOrganizationModalContent } from './edit-organization.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        NxGenericDropdownModule,
        CheckboxModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [NxEditOrganizationModalContent],
    providers: [],
    exports: [NxEditOrganizationModalContent],
})
export class NxEditOrganizationModalModule {}
