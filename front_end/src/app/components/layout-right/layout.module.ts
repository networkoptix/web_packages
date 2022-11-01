import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxLayoutRightComponent } from './layout.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxLayoutRightComponent
    ],
    providers: [
        NxLayoutRightComponent
    ],
    exports: [
        NxLayoutRightComponent
    ]
})

export class LayoutRightModule {}
