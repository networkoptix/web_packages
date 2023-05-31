import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { PermissionsModule } from '@components/dropdowns/permissions/permissions.module';
import { EmailModule } from '@components/email-input/email.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { AddUserModalContent } from './add-user.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        EmailModule,
        PermissionsModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [
        AddUserModalContent,
    ],
    providers: [],
    exports: [
        AddUserModalContent,
    ]
})
export class AddUserModalModule {}
