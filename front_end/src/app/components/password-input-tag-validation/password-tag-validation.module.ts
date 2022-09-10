import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { TagModule } from '@components/tag/tag.module';

import { NxPasswordTagValidationComponent } from './password-tag-validation.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        TagModule,
    ],
    declarations: [
        NxPasswordTagValidationComponent
    ],
    providers: [
        NxPasswordTagValidationComponent
    ],
    exports: [
        NxPasswordTagValidationComponent
    ]
})

export class PasswordTagValidationModule {}
