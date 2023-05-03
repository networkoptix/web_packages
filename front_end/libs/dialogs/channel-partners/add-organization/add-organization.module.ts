import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { AddOrganizationModalContent } from './add-organization.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule.forRoot(),
        TranslateModule,

        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [
        AddOrganizationModalContent,
    ],
    providers: [],
    exports: [
        AddOrganizationModalContent,
    ]
})
export class AddOrganizationModalModule {}
