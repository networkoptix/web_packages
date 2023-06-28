import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';

import { UpdateCameraCredentialsModalContent } from './update-camera-credentials.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
    declarations: [UpdateCameraCredentialsModalContent],
    providers: [],
    exports: [UpdateCameraCredentialsModalContent],
})
export class UpdateCameraCredentialsModalModule {}
