import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
// import { MultiSelectModule } from '@components/dropdowns/multi-select/multi-select.module';
import { NxEmailComponent } from '@components/email-input/email.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';

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
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
    declarations: [NxAddOrgUserModalContent],
    providers: [],
    exports: [NxAddOrgUserModalContent],
})
export class NxAddOrgUserModule {}
