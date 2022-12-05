import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { PipesModule } from '@pipes/pipes.module';

import {
    GenericModalContent,
} from './generic.component';

@NgModule({
    imports: [
        CommonModule,
        PipesModule,
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
