import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxAccountSettingsDropdown } from './account-settings.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxAccountSettingsDropdown
    ],
    providers: [
        NxAccountSettingsDropdown
    ],
    exports: [
        NxAccountSettingsDropdown
    ]
})

export class AccountSettingsModule {}
