import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { AccountSettingsModule } from '@components/dropdowns/account-settings/account-settings.module';
import { AdditionalSystemsTileModule } from '@components/dropdowns/drop-menu/additional-systems-tile/additional-systems-tile.module';
import { DropMenuModule } from '@components/dropdowns/drop-menu/drop-menu.module';
import { NavigationTileModule } from '@components/dropdowns/drop-menu/navigation-tile/navigation-tile.module';
import { SystemTileModule } from '@components/dropdowns/drop-menu/system-tile/system-tile.module';
import { LanguageModule } from '@components/dropdowns/language/language.module';

import { NxHeaderComponent } from './header.component';
import { MainButtonModule } from './main-button/main-button.module';
import { NavDropdownModule } from './nav-dropdown/nav-dropdown.module';
import { TabsModule } from './tabs/tabs.module';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        AccountSettingsModule,
        LanguageModule,
        MainButtonModule,
        NavDropdownModule,
        TabsModule,
        DropMenuModule,
        AdditionalSystemsTileModule,
        NavigationTileModule,
        SystemTileModule
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

export class HeaderModule { }
