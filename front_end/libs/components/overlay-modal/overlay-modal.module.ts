import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@pipes/pipes.module';

import { NxOverlayModalComponent } from './overlay-modal.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        PipesModule
    ],
    declarations: [
        NxOverlayModalComponent
    ],
    providers: [
        NxOverlayModalComponent
    ],
    exports: [
        NxOverlayModalComponent
    ]
})

export class OverlayModalModule {}
