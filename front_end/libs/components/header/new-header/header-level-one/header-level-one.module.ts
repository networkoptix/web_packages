import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { AccountSettingsModule } from '@components/dropdowns/account-settings/account-settings.module';
import { LanguageModule } from '@components/dropdowns/language/language.module';

import { NxHeaderLevelOneComponent } from './header-level-one.component';

@NgModule({
    imports: [CommonModule, TranslateModule, AccountSettingsModule, LanguageModule],
    declarations: [NxHeaderLevelOneComponent],
    providers: [NxHeaderLevelOneComponent],
    exports: [NxHeaderLevelOneComponent],
})
export class HeaderLevelOneModule {}
