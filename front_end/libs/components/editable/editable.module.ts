import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { NxEditableHeading } from '@components/editable/heading/editable-heading.component';

import { NxTextEditableComponent } from './editable.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
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
