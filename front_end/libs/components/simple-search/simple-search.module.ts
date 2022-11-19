import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
// import { TranslateModule } from '@ngx-translate/core';

import { NxSimpleSearchComponent } from './simple-search.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule.forRoot(),
        // TranslateModule
    ],
    declarations: [
        NxSimpleSearchComponent,
    ],
    providers: [],
    exports: [
        NxSimpleSearchComponent,
    ]
})
export class NxSimpleSearchModule {}
