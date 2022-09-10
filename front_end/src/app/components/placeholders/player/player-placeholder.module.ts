import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxPlayerPlaceholderComponent } from './player-placeholder.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxPlayerPlaceholderComponent
    ],
    providers: [
        NxPlayerPlaceholderComponent
    ],
    exports: [
        NxPlayerPlaceholderComponent
    ]
})

export class PlayerPlaceholderModule {}
