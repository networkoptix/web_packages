import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxNumericComponent } from './numeric.component';

@NgModule({
    imports: [CommonModule, FormsModule, AngularSvgIconModule],
    declarations: [NxNumericComponent],
    providers: [NxNumericComponent],
    exports: [NxNumericComponent],
})
export class NumericModule {}
