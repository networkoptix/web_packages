import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ResizeModule } from '@directives/resize/resize.module';

import { NxMultiLineEllipsisComponent } from './mle.component';

@NgModule({
    imports: [CommonModule, ResizeModule],
    declarations: [NxMultiLineEllipsisComponent],
    providers: [NxMultiLineEllipsisComponent],
    exports: [NxMultiLineEllipsisComponent],
})
export class MultiLineEllipsisModule {}
