import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxCarouselComponent } from './carousel.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxCarouselComponent
    ],
    providers: [
        NxCarouselComponent
    ],
    exports: [
        NxCarouselComponent
    ]
})

export class CarouselModule {}
