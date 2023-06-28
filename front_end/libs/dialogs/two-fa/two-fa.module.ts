import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { QrCodeModule } from 'ng-qrcode';

import { NxInfoBlockComponent } from '@components/info-block/info-block.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';

import { TwoFAModalContent } from './two-fa.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,

        AngularSvgIconModule,
        QrCodeModule,
        TranslateModule,

        NxInfoBlockComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
    declarations: [TwoFAModalContent],
    providers: [],
    exports: [],
})
export class TwoFAModalModule {}
