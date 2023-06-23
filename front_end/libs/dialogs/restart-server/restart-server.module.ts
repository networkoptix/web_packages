import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';
import { PipesModule } from '@pipes/pipes.module';

import { RestartServerModalContent } from './restart-server.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        PipesModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [RestartServerModalContent],
    providers: [],
    exports: [RestartServerModalContent],
})
export class RestartServerModalModule {}
