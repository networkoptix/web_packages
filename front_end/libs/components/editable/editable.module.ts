import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxEditableHeading } from '@components/editable/heading/editable-heading.component';

import { NxTextEditableComponent } from './editable.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule
    ],
    declarations: [
        NxEditableHeading,
        NxTextEditableComponent
    ],
    providers: [
        NxEditableHeading,
        NxTextEditableComponent
    ],
    exports: [
        NxEditableHeading,
        NxTextEditableComponent
    ]
})

export class EditableModule {}
