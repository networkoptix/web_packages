import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxAccountSettingsDropdown } from './account-settings.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
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
