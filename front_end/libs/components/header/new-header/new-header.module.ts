import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { HeaderLevelOneModule } from './header-level-one/header-level-one.module';
import { HeaderLevelTwoModule } from './header-level-two/header-level-two.module';
import { HeaderMobileModule } from './mobile/mobile.module';
import { NxNewHeaderComponent } from './new-header.component';

@NgModule({
    imports: [CommonModule, HeaderLevelOneModule, HeaderLevelTwoModule, HeaderMobileModule],
    declarations: [NxNewHeaderComponent],
    providers: [NxNewHeaderComponent],
    exports: [NxNewHeaderComponent],
})
export class NewHeaderModule {}
