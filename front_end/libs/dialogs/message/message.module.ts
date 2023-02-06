import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';
import { PipesModule } from '@pipes/pipes.module';

import { MessageModalContent } from './message.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule.forRoot(),
        TranslateModule,

        PipesModule,
        NxGenericDropdownModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [
        MessageModalContent,
    ],
    providers: [],
    exports: [
        MessageModalContent,
    ]
})
export class MessageModalModule {}
