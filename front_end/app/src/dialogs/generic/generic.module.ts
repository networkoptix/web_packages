import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import {
    GenericModalContent,
    NxModalGenericComponent
} from './generic.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
    ],
    providers: [
        GenericModalContent,
        NxModalGenericComponent
    ],
    declarations: [
        GenericModalContent,
        NxModalGenericComponent
    ],
    exports: [
        GenericModalContent,
        NxModalGenericComponent
    ]
})
export class GenericDialogModule {
}
