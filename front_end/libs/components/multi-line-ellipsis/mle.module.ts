import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxMultiLineEllipsisComponent } from './mle.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxMultiLineEllipsisComponent
    ],
    providers: [
        NxMultiLineEllipsisComponent
    ],
    exports: [
        NxMultiLineEllipsisComponent
    ]
})

export class MultiLineEllipsisModule {}
