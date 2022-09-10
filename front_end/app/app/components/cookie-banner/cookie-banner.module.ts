import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxCookieBannerComponent } from './cookie-banner.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxCookieBannerComponent
    ],
    providers: [
        NxCookieBannerComponent
    ],
    exports: [
        NxCookieBannerComponent
    ]
})

export class CookieBannerModule {}
