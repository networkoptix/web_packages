import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxPreLoaderComponent } from './pre-loader.component';

@NgModule({
    imports: [
        CommonModule
    ],
    declarations: [
        NxPreLoaderComponent
    ],
    providers: [
        NxPreLoaderComponent
    ],
    exports: [
        NxPreLoaderComponent
    ]
})

export class PreLoaderModule {}
