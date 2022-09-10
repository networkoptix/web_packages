import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { NxEditableHeading } from '@components/editable/heading/editable-heading.component';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxTextEditableComponent } from './editable.component';

@NgModule({
    imports: [
        SharedComponentsModule,
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
