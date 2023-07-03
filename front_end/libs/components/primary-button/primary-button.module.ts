import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxPrimaryButtonComponent } from './primary-button.component';

@NgModule({
    imports: [CommonModule, TranslateModule],
    declarations: [NxPrimaryButtonComponent],
    providers: [NxPrimaryButtonComponent],
    exports: [NxPrimaryButtonComponent],
})
export class PrimaryButtonModule {}
