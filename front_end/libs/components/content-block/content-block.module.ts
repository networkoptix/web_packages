import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxContentBlockComponent } from './content-block.component';

@NgModule({
    imports: [
        CommonModule
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
