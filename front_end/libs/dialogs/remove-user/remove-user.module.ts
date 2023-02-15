import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';
import { UpdateWebadminSessionModule } from '@components/update-webadmin-session/update-webadmin-session.module';

import { RemoveUserModalContent } from './remove-user.component';

@NgModule({
    imports: [
        CommonModule,
        // FormsModule,
        // AngularSvgIconModule.forRoot(),
        TranslateModule,

        ProcessButtonModule,
        ProcessCancelButtonModule,
        UpdateWebadminSessionModule
    ],
    declarations: [
        RemoveUserModalContent,
    ],
    providers: [],
    exports: [
        RemoveUserModalContent,
    ]
})
export class RemoveUserModalModule {}
