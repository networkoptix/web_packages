import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { AddPartnerModalContent } from './add-partner.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule.forRoot(),
        TranslateModule,
    ],
    declarations: [
        AddPartnerModalContent,
    ],
    providers: [],
    exports: [
        AddPartnerModalContent,
    ]
})
export class AddPartnerModalModule {}
