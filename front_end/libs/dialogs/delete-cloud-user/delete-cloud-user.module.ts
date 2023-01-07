import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { DeleteCloudUserModalContent } from './delete-cloud-user.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule.forRoot(),
        // TranslateModule,

        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [
        DeleteCloudUserModalContent,
    ],
    providers: [],
    exports: [
        DeleteCloudUserModalContent,
    ]
})
export class DeleteCloudUserModalModule {}
