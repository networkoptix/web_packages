import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxPaginatorComponent } from './paginator.component';

@NgModule({
    imports: [
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
