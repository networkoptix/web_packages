import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxMultiSelectDropdown } from '@components/dropdowns/multi-select/multi-select.component';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { NxEditOrgUserModalContent } from './edit-org-user.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        NxGenericDropdownModule,
        NxMultiSelectDropdown,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [NxEditOrgUserModalContent],
    providers: [],
    exports: [NxEditOrgUserModalContent],
})
export class NxEditOrgUserModule {}
