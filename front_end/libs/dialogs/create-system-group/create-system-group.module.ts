import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';

import { CreateSystemGroupModalContent } from './create-system-group.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        // AngularSvgIconModule,
        TranslateModule,
    ],
    declarations: [CreateSystemGroupModalContent],
    providers: [],
    exports: [CreateSystemGroupModalContent],
})
export class CreateSystemGroupModalModule {}
