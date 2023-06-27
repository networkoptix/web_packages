import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxAccountSettingsDropdown } from '@components/dropdowns/account-settings/account-settings.component';
import { LanguageModule } from '@components/dropdowns/language/language.module';

import { NxHeaderLevelOneComponent } from './header-level-one.component';

@NgModule({
    imports: [CommonModule, TranslateModule, NxAccountSettingsDropdown, LanguageModule],
    declarations: [NxHeaderLevelOneComponent],
    providers: [NxHeaderLevelOneComponent],
    exports: [NxHeaderLevelOneComponent],
})
export class HeaderLevelOneModule {}
