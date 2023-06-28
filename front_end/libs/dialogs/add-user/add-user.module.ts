import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxPermissionsDropdown } from '@components/dropdowns/permissions/permissions.component';
import { NxEmailComponent } from '@components/email-input/email.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';

import { AddUserModalContent } from './add-user.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        NxEmailComponent,
        NxPermissionsDropdown,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
    declarations: [AddUserModalContent],
    providers: [],
    exports: [AddUserModalContent],
})
export class AddUserModalModule {}
