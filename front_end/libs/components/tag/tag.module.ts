import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxTagComponent } from './tag.component';

@NgModule({
    imports: [
        CommonModule
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
