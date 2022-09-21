import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxTagComponent } from './tag.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxTagComponent
    ],
    providers: [
        NxTagComponent
    ],
    exports: [
        NxTagComponent
    ]
})

export class TagModule {}
