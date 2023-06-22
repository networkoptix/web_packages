import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ProcessButtonModule } from '@components/process-button/process-button.module';

import { NxClientButtonComponent } from './client-button.component';

@NgModule({
    imports: [CommonModule, TranslateModule, ProcessButtonModule],
    declarations: [NxClientButtonComponent],
    providers: [NxClientButtonComponent],
    exports: [NxClientButtonComponent],
})
export class ClientButtonModule {}
