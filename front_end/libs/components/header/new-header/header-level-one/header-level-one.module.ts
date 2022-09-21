import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { AccountSettingsModule } from '@components/dropdowns/account-settings/account-settings.module';

import { NxHeaderLevelOneComponent } from './header-level-one.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        AccountSettingsModule,
    ],
    declarations: [
        NxHeaderLevelOneComponent
    ],
    providers: [
        NxHeaderLevelOneComponent
    ],
    exports: [
        NxHeaderLevelOneComponent
    ]
})

export class HeaderLevelOneModule {}
