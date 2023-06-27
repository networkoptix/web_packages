import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
// import { MultiSelectModule } from '@components/dropdowns/multi-select/multi-select.module';
import { NxEmailComponent } from '@components/email-input/email.component';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { NxAddOrgUserModalContent } from './add-org-user.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        NxEmailComponent,
        NxGenericDropdownModule,
        // MultiSelectModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [NxAddOrgUserModalContent],
    providers: [],
    exports: [NxAddOrgUserModalContent],
})
export class NxAddOrgUserModule {}
