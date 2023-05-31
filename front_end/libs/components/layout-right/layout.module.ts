import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';

import { NxLayoutRightComponent } from './layout.component';

@NgModule({
    imports: [
        CommonModule,
        PreLoaderModule,
    ],
    declarations: [
        NxLayoutRightComponent
    ],
    providers: [
        NxLayoutRightComponent
    ],
    exports: [
        NxLayoutRightComponent
    ]
})

export class LayoutRightModule {}
