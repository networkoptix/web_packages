import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { HeaderLogoAreaModule } from '../logo-area/logo-area.module';

import { MobileHeaderMenuModule } from './mobile-menu/mobile-menu.module';
import { NxHeaderMobileComponent } from './mobile.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
        HeaderLogoAreaModule,
        MobileHeaderMenuModule,
    ],
    declarations: [
        NxHeaderMobileComponent
    ],
    providers: [
        NxHeaderMobileComponent
    ],
    exports: [
        NxHeaderMobileComponent
    ]
})

export class HeaderMobileModule {}
