import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxRadioComponent } from './radio.component';

@NgModule({
    imports: [CommonModule],
    declarations: [NxRadioComponent],
    providers: [NxRadioComponent],
    exports: [NxRadioComponent],
})
export class RadioModule {}
