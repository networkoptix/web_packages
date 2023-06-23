import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { WebGlSelectTimeRangeModalContent } from './select-time-range.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,
    ],
    declarations: [WebGlSelectTimeRangeModalContent],
    providers: [],
    exports: [WebGlSelectTimeRangeModalContent],
})
export class NxWebGlSelectTimeRangeModalModule {}
