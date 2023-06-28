import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { PipesModule } from '@pipes/pipes.module';

import { DetachServerModalContent } from './detach-server.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        PipesModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
    declarations: [DetachServerModalContent],
    providers: [],
    exports: [DetachServerModalContent],
})
export class NxDetachServerModalModule {}
