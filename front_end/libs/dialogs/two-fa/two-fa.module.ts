import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { QrCodeModule } from 'ng-qrcode';

import { NxInfoBlockComponent } from '@components/info-block/info-block.component';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { TwoFAModalContent } from './two-fa.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,

        AngularSvgIconModule,
        QrCodeModule,
        TranslateModule,

        NxInfoBlockComponent,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [TwoFAModalContent],
    providers: [],
    exports: [],
})
export class TwoFAModalModule {}
