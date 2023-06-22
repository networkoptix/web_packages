import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { HeaderLogoAreaModule } from '../logo-area/logo-area.module';

import { NxHeaderLevelTwoComponent } from './header-level-two.component';
import { MainActionModule } from './main-action/main-action.module';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        HeaderLogoAreaModule,
        MainActionModule,
    ],
    declarations: [NxHeaderLevelTwoComponent],
    providers: [NxHeaderLevelTwoComponent],
    exports: [NxHeaderLevelTwoComponent],
})
export class HeaderLevelTwoModule {}
