import { NgModule } from '@angular/core';
import { GenericModalContent, NxModalGenericComponent } from './generic.component';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
    imports: [
         CommonModule,
        BrowserModule,
        BrowserAnimationsModule,
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
