import { NgModule } from '@angular/core';

import { NxMultiSelectV2ItemComponent } from './items/multi-select-item/multi-select-item.component';
import { NxParagraphSelectItemComponent } from './items/paragraph-select-item/paragraph-select-item.component';
import { NxSelectV2ItemComponent } from './items/select-item/select-item.component';
import { NxMultiSelectV2Component } from './multi-select-v2.component';
import { NxSelectV2Component } from './select-v2.component';

@NgModule({
    imports: [
        NxSelectV2Component,
        NxMultiSelectV2Component,
        NxSelectV2ItemComponent,
        NxParagraphSelectItemComponent,
        NxMultiSelectV2ItemComponent,
    ],
    exports: [
        NxSelectV2Component,
        NxMultiSelectV2Component,
        NxSelectV2ItemComponent,
        NxParagraphSelectItemComponent,
        NxMultiSelectV2ItemComponent,
    ],
})
export class NxSelectV2Module {}
