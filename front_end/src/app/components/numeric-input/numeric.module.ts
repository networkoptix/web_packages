import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxNumericComponent } from './numeric.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
    ],
    declarations: [
        NxNumericComponent
    ],
    providers: [
        NxNumericComponent
    ],
    exports: [
        NxNumericComponent
    ]
})

export class NumericModule {}
