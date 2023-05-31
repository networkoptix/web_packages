import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxProcessCancelButtonComponent } from './process-cancel-button.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule
    ],
    declarations: [
        NxProcessCancelButtonComponent
    ],
    providers: [
        NxProcessCancelButtonComponent
    ],
    exports: [
        NxProcessCancelButtonComponent
    ]
})

export class ProcessCancelButtonModule {}
