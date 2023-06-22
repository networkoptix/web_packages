import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';

import { NxSliderComponent } from './slider.component';

@NgModule({
    imports: [DragDropModule],
    declarations: [NxSliderComponent],
    providers: [NxSliderComponent],
    exports: [NxSliderComponent],
})
export class NxSliderModule {}
