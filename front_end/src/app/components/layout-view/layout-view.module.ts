import { NgModule } from '@angular/core';

import { ComponentsCommonModule } from '@components/components-common.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { LayoutGridModule } from '@components/layout-grid/layout-grid.module';

import { NxLayoutViewComponent } from './layout-view.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        ComponentsCommonModule,
        LayoutGridModule
    ],
    declarations: [
        NxLayoutViewComponent
    ],
    providers: [
        NxLayoutViewComponent
    ],
    exports: [
        NxLayoutViewComponent
    ]
})

export class LayoutViewModule { }
