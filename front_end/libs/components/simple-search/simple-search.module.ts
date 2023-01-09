import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';

import { NxSimpleSearchComponent } from './simple-search.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule.forRoot(),
        NgxTranslateCutModule,
        TranslateModule,
        NxSearchHighlightModule,
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
