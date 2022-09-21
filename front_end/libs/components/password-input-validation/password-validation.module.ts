import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxPasswordValidationComponent } from './password-validation.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxPasswordValidationComponent
    ],
    providers: [
        NxPasswordValidationComponent
    ],
    exports: [
        NxPasswordValidationComponent
    ]
})

export class PasswordValidationModule {}
