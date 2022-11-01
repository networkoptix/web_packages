import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxContentBlockSectionComponent } from './section.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxContentBlockSectionComponent
    ],
    providers: [
        NxContentBlockSectionComponent
    ],
    exports: [
        NxContentBlockSectionComponent
    ]
})

export class ContentBlockSectionModule {}
