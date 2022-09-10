import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxMobileHeaderMenuComponent } from './mobile-menu.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxMobileHeaderMenuComponent
    ],
    providers: [
        NxMobileHeaderMenuComponent
    ],
    exports: [
        NxMobileHeaderMenuComponent
    ]
})

export class MobileHeaderMenuModule {}
