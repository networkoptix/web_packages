import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
// import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxTagComponent } from '@components/tag/tag.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';

import { NxTagFilterComponent } from './tag-filter.component';

@NgModule({
    imports: [
        CommonModule,
        // FormsModule,
        AngularSvgIconModule,
        TranslateModule,

        NxTagComponent,
        NxAddSvgSrcDirective,
    ],
    declarations: [NxTagFilterComponent],
    providers: [],
    exports: [NxTagFilterComponent],
})
export class NxTagFilterModule {}
