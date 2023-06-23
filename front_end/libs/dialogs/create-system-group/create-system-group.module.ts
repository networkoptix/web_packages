import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { CreateSystemGroupModalContent } from './create-system-group.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
        // AngularSvgIconModule,
        TranslateModule,
    ],
    declarations: [CreateSystemGroupModalContent],
    providers: [],
    exports: [CreateSystemGroupModalContent],
})
export class CreateSystemGroupModalModule {}
