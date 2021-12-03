import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxMenuButtonComponent } from './button.component';

@NgModule({
    imports: [
        CommonModule
    ],
    declarations: [
        NxMenuButtonComponent
    ],
    providers: [],
    exports: [
        NxMenuButtonComponent
    ]
})
export class NxButtonModule {
}
