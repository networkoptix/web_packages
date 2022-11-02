import { NgModule } from '@angular/core';

import { ComponentsCommonModule } from '@components/components-common.module';
import { ComponentsCoreModule } from '@components/components-core.module';

import { NxLayoutPtzComponent } from './layout-ptz.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        ComponentsCommonModule
    ],
    declarations: [
        NxLayoutPtzComponent
    ],
    providers: [
        NxLayoutPtzComponent
    ],
    exports: [
        NxLayoutPtzComponent
    ]
})

export class LayoutPtzModule { }
