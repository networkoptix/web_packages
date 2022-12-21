import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxMatLikeInputComponent } from './input.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
    ],
    declarations: [
        NxMatLikeInputComponent
    ],
    providers: [
        NxMatLikeInputComponent
    ],
    exports: [
        NxMatLikeInputComponent
    ]
})

export class NxMatLikeInputModule {}
