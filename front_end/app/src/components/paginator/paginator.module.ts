import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxPaginatorComponent } from './paginator.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxPaginatorComponent
    ],
    providers: [
        NxPaginatorComponent
    ],
    exports: [
        NxPaginatorComponent
    ]
})

export class PaginatorModule {}
