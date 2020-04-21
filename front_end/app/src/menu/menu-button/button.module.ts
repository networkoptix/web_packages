import { NgModule }              from '@angular/core';
import { CommonModule }          from '@angular/common';
import { NxMenuButtonComponent } from './button.component';

@NgModule({
    imports: [
        CommonModule
    ],
    declarations: [
        NxMenuButtonComponent
    ],
    entryComponents: [],
    providers      : [],
    exports        : [
        NxMenuButtonComponent
    ]
})
export class NxButtonModule {
}
