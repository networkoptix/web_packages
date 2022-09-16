import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxHeaderLogoAreaComponent } from './logo-area.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
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
