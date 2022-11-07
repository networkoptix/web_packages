import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { AccountSettingsModule } from '@components/dropdowns/account-settings/account-settings.module';
import { LanguageModule } from '@components/dropdowns/language/language.module';

import { NxHeaderLevelOneComponent } from './header-level-one.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        AccountSettingsModule,
        LanguageModule
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
