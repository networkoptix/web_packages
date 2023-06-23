import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { MultiSelectModule } from '@components/dropdowns/multi-select/multi-select.module';
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
        MultiSelectModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [NxEditOrgUserModalContent],
    providers: [],
    exports: [NxEditOrgUserModalContent],
})
export class NxEditOrgUserModule {}
