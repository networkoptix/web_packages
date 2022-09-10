import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxMainActionComponent } from './main-action.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxMainActionComponent
    ],
    providers: [
        NxMainActionComponent
    ],
    exports: [
        NxMainActionComponent
    ]
})

export class MainActionModule {}
