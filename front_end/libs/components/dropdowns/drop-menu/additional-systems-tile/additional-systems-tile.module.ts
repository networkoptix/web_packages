import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxAdditionalSystemsTileComponent } from './additional-systems-tile.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule
    ],
    declarations: [
        NxAdditionalSystemsTileComponent
    ],
    providers: [
        NxAdditionalSystemsTileComponent
    ],
    exports: [
        NxAdditionalSystemsTileComponent
    ]
})

export class AdditionalSystemsTileModule {}
