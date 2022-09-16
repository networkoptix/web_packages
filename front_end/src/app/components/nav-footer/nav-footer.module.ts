import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxNavFooterComponent } from './nav-footer.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
    ],
    declarations: [
        NxNavFooterComponent
    ],
    providers: [
        NxNavFooterComponent
    ],
    exports: [
        NxNavFooterComponent
    ]
})

export class NavFooterModule {}
