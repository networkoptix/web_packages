import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { AccountSettingsModule } from '@components/dropdowns/account-settings/account-settings.module';
import { LanguageModule } from '@components/dropdowns/language/language.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxHeaderComponent } from './header.component';
import { MainButtonModule } from './main-button/main-button.module';
import { NavDropdownModule } from './nav-dropdown/nav-dropdown.module';
import { NewHeaderModule } from './new-header/new-header.module';
import { TabsModule } from './tabs/tabs.module';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
        AccountSettingsModule,
        LanguageModule,
        MainButtonModule,
        NavDropdownModule,
        NewHeaderModule,
        TabsModule,
    ],
    declarations: [
        NxHeaderComponent
    ],
    providers: [
        NxHeaderComponent
    ],
    exports: [
        NxHeaderComponent
    ]
})

export class HeaderModule {}
