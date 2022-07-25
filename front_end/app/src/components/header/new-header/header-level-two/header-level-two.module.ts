import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { HeaderLogoAreaModule } from '../logo-area/logo-area.module';

import { NxHeaderLevelTwoComponent } from './header-level-two.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
        HeaderLogoAreaModule,
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
