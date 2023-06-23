import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';
import { DirectivesModule } from '@directives/directives.module';

import { Mandatory2faModalContent } from './mandatory-2fa.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,
        RouterModule,

        DirectivesModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [Mandatory2faModalContent],
    providers: [],
    exports: [Mandatory2faModalContent],
})
export class Mandatory2faModalModule {}
