import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { NxMatLikeInputModule } from '@components/mat-like-components/mat-like-input/input.module';

import { NxMatLikePasswordComponent } from './password.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        NxMatLikeInputModule,
    ],
    declarations: [
        NxMatLikePasswordComponent
    ],
    providers: [
        NxMatLikePasswordComponent
    ],
    exports: [
        NxMatLikePasswordComponent
    ]
})

export class NxMatLikePasswordModule {}
