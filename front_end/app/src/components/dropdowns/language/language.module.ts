import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxLanguageDropdown, NxHeaderLanguageDropdown } from './language.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
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
