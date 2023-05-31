import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
// import { FormsModule } from '@angular/forms';
// import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { TagModule } from '@components/tag/tag.module';

import { NxTagFilterComponent } from './tag-filter.component';

@NgModule({
    imports: [
        CommonModule,
        // FormsModule,
        AngularSvgIconModule,
        // TranslateModule,

        TagModule,
    ],
    declarations: [
        NxTagFilterComponent,
    ],
    providers: [],
    exports: [
        NxTagFilterComponent,
    ]
})
export class NxTagFilterModule {}
