import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxCarouselComponent } from './carousel.component';

@NgModule({
    imports: [
        CommonModule
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
