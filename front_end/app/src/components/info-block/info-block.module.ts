import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxInfoBlockComponent } from './info-block.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxInfoBlockComponent
    ],
    providers: [
        NxInfoBlockComponent
    ],
    exports: [
        NxInfoBlockComponent
    ]
})

export class InfoBlockModule {}
