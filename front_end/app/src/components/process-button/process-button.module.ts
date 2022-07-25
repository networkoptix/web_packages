import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxProcessButtonComponent } from './process-button.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
    ],
    declarations: [
        NxProcessButtonComponent
    ],
    providers: [
        NxProcessButtonComponent
    ],
    exports: [
        NxProcessButtonComponent
    ]
})

export class ProcessButtonModule {}
