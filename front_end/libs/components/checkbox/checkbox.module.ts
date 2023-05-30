import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxCheckboxComponent } from './checkbox.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule
    ],
    declarations: [
        NxCheckboxComponent
    ],
    providers: [
        NxCheckboxComponent
    ],
    exports: [
        NxCheckboxComponent
    ]
})

export class CheckboxModule {}
