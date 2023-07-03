import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { AlertBlockModule } from '@components/content-block/alert/block.module';

import { NxDangerButtonComponent } from './danger-button.component';

@NgModule({
    imports: [CommonModule, TranslateModule, AlertBlockModule],
    declarations: [NxDangerButtonComponent],
    providers: [NxDangerButtonComponent],
    exports: [NxDangerButtonComponent],
})
export class DangerButtonModule {}
