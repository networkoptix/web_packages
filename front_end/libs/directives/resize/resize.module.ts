import { NgModule } from '@angular/core';

import { NxResizeObserver } from './nx-resize.directive';

@NgModule({
    declarations: [NxResizeObserver],
    exports: [NxResizeObserver],
})
export class ResizeModule {}
