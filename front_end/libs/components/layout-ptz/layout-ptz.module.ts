import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { DirectivesModule } from '@directives/directives.module';

import { NxLayoutPtzComponent } from './layout-ptz.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        DirectivesModule,
    ],
    declarations: [
        NxLayoutPtzComponent
    ],
    providers: [
        NxLayoutPtzComponent
    ],
    exports: [
        NxLayoutPtzComponent
    ]
})

export class LayoutPtzModule { }
