import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxDangerButtonComponent } from './danger-button.component';

@NgModule({
    imports: [CommonModule, TranslateModule],
    declarations: [NxDangerButtonComponent],
    providers: [NxDangerButtonComponent],
    exports: [NxDangerButtonComponent],
})
export class DangerButtonModule {}
