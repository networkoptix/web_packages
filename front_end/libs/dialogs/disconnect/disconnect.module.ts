import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { DisconnectModalContent } from './disconnect.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [
        DisconnectModalContent,
    ],
    providers: [],
    exports: [
        DisconnectModalContent,
    ]
})
export class DisconnectModalModule {}
