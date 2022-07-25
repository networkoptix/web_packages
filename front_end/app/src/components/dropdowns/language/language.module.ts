import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxLanguageDropdown, NxHeaderLanguageDropdown } from './language.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxLanguageDropdown,
        NxHeaderLanguageDropdown
    ],
    providers: [
        NxLanguageDropdown,
        NxHeaderLanguageDropdown
    ],
    exports: [
        NxLanguageDropdown,
        NxHeaderLanguageDropdown
    ]
})

export class LanguageModule {}
