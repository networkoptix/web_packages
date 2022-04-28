import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import {
    GenericModalContent,
} from './generic.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
    ],
    providers: [
        GenericModalContent,
    ],
    declarations: [
        GenericModalContent,
    ],
    exports: [
        GenericModalContent,
    ]
})
export class GenericDialogModule {
}
