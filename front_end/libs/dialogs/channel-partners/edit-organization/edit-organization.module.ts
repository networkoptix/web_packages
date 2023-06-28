import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';

import { NxEditOrganizationModalContent } from './edit-organization.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        NxGenericDropdownModule,
        NxCheckboxComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
    declarations: [NxEditOrganizationModalContent],
    providers: [],
    exports: [NxEditOrganizationModalContent],
})
export class NxEditOrganizationModalModule {}
