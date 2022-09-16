import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { HeaderLogoAreaModule } from '../logo-area/logo-area.module';

import { NxHeaderLevelTwoComponent } from './header-level-two.component';
import { MainActionModule } from './main-action/main-action.module';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        HeaderLogoAreaModule,
        MainActionModule
    ],
    declarations: [
        NxHeaderLevelTwoComponent
    ],
    providers: [
        NxHeaderLevelTwoComponent
    ],
    exports: [
        NxHeaderLevelTwoComponent
    ]
})

export class HeaderLevelTwoModule {}
