import { NgModule } from '@angular/core';
import { GenericModalContent, NxModalGenericComponent } from './generic.component';
import { CommonModule } from '@angular/common';

@NgModule({
    imports: [
        CommonModule
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
