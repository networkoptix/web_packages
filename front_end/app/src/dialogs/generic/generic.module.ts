import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
    GenericModalContent,
} from './generic.component';

@NgModule({
    imports: [
        CommonModule
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
