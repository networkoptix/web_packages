import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { Client2faWarningModalContent } from './client-2fa-warning.component';

@NgModule({
    imports: [
        CommonModule,
        // FormsModule,
        // AngularSvgIconModule,
        TranslateModule,
    ],
    declarations: [
        Client2faWarningModalContent,
    ],
    providers: [],
    exports: [
        Client2faWarningModalContent,
    ]
})
export class Client2faWarningModalModule {}
