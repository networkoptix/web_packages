import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SelectTimeRangeModalContent } from './select-time-range.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule.forRoot(),
        TranslateModule,
    ],
    declarations: [
        SelectTimeRangeModalContent,
    ],
    providers: [],
    exports: [
        SelectTimeRangeModalContent,
    ]
})
export class SelectTimeRangeModalModule {}
