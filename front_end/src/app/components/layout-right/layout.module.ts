import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxLayoutRightComponent } from './layout.component';

@NgModule({
    imports: [
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
