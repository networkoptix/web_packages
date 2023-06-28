import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';

import { DeleteCloudUserModalContent } from './delete-cloud-user.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        // TranslateModule,

        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
    declarations: [DeleteCloudUserModalContent],
    providers: [],
    exports: [DeleteCloudUserModalContent],
})
export class DeleteCloudUserModalModule {}
