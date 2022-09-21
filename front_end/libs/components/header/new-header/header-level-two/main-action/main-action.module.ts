import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxMainActionComponent } from './main-action.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
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
