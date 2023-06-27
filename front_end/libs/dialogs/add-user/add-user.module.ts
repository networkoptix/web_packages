import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxPermissionsDropdown } from '@components/dropdowns/permissions/permissions.component';
import { NxEmailComponent } from '@components/email-input/email.component';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { AddUserModalContent } from './add-user.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        NxEmailComponent,
        NxPermissionsDropdown,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [AddUserModalContent],
    providers: [],
    exports: [AddUserModalContent],
})
export class AddUserModalModule {}
