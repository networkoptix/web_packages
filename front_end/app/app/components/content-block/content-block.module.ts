import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxContentBlockComponent } from './content-block.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxContentBlockComponent
    ],
    providers: [
        NxContentBlockComponent
    ],
    exports: [
        NxContentBlockComponent
    ]
})

export class ContentBlockModule {}
