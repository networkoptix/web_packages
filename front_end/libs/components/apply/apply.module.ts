import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { NxApplyComponent } from './apply.component';

@NgModule({
    imports: [CommonModule, TranslateModule, ProcessButtonModule, ProcessCancelButtonModule],
    declarations: [NxApplyComponent],
    providers: [NxApplyComponent],
    exports: [NxApplyComponent],
})
export class ApplyModule {}
