import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxSliderComponent } from './slider.component';

@NgModule({
    imports: [
        DragDropModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxSliderComponent
    ],
    providers: [
        NxSliderComponent
    ],
    exports: [
        NxSliderComponent
    ]
})

export class NxSliderModule {}
