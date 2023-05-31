import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { NxPaginatorComponent } from './paginator.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule
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
