import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxHeaderLogoAreaComponent } from './logo-area.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxHeaderLogoAreaComponent
    ],
    providers: [
        NxHeaderLogoAreaComponent
    ],
    exports: [
        NxHeaderLogoAreaComponent
    ]
})

export class HeaderLogoAreaModule {}
