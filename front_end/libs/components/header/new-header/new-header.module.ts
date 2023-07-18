import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxHeaderLevelOneComponent } from '@components/header/new-header/header-level-one/header-level-one.component';
import { NxHeaderLevelTwoComponent } from '@components/header/new-header/header-level-two/header-level-two.component';
import { NxHeaderMobileComponent } from '@components/header/new-header/mobile/mobile.component';
import { NxThemeGeneratorComponent } from '@components/theme-generator/theme-colors.component';

import { NxNewHeaderComponent } from './new-header.component';

@NgModule({
    imports: [
        CommonModule,
        NxHeaderLevelOneComponent,
        NxHeaderLevelTwoComponent,
        NxHeaderMobileComponent,
        NxThemeGeneratorComponent,
    ],
    declarations: [NxNewHeaderComponent],
    providers: [NxNewHeaderComponent],
    exports: [NxNewHeaderComponent],
})
export class NewHeaderModule {}
