import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAccountSettingsDropdown } from '@components/dropdowns/account-settings/account-settings.component';
import { NxAdditionalSystemsTileComponent } from '@components/dropdowns/drop-menu/additional-systems-tile/additional-systems-tile.component';
import { NxDropMenu } from '@components/dropdowns/drop-menu/drop-menu.component';
import { NxNavigationTileComponent } from '@components/dropdowns/drop-menu/navigation-tile/navigation-tile.component';
import { NxSystemTileComponent } from '@components/dropdowns/drop-menu/system-tile/system-tile.component';
import { LanguageModule } from '@components/dropdowns/language/language.module';
import { NxHeaderMainButtonComponent } from '@components/header/main-button/main-button.component';
import { NxNavDropdownComponent } from '@components/header/nav-dropdown/nav-dropdown.component';
import { NxTabsComponent } from '@components/header/tabs/tabs.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';

import { NxHeaderComponent } from './header.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        AngularSvgIconModule,
        NxAccountSettingsDropdown,
        LanguageModule,
        NxHeaderMainButtonComponent,
        NxNavDropdownComponent,
        NxTabsComponent,
        NxDropMenu,
        NxAdditionalSystemsTileComponent,
        NxNavigationTileComponent,
        NxSystemTileComponent,
        NxResizeObserver,
        NxClickElsewhereDirective,
        NxAddSvgSrcDirective,
    ],
    declarations: [NxHeaderComponent],
    providers: [NxHeaderComponent],
    exports: [NxHeaderComponent],
})
export class HeaderModule {}
