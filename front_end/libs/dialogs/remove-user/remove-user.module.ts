import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { RemoveUserModalContent } from './remove-user.component';

@NgModule({
    imports: [
        CommonModule,
        // FormsModule,
        // AngularSvgIconModule.forRoot(),
        TranslateModule,

        ProcessButtonModule,
        ProcessCancelButtonModule,
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
