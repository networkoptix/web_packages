import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { EmailModule } from '@components/email-input/email.module';

import { AddCustomizationUserModalContent } from './add-customization-user.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule.forRoot(),
        TranslateModule,

        EmailModule,
    ],
    declarations: [
        AddCustomizationUserModalContent,
    ],
    providers: [],
    exports: [
        AddCustomizationUserModalContent,
    ]
})
export class AddCustomizationUserModalModule {}
