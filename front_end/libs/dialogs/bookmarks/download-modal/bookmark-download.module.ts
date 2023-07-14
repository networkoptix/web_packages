import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxBookmarkDownloadComponent } from './bookmark-download.component';

@NgModule({
    declarations: [
        NxBookmarkDownloadComponent,
    ],
    providers: [],
    exports: [
        NxBookmarkDownloadComponent,
    ],
    imports: [
        AngularSvgIconModule,
        CommonModule,
        TranslateModule,
    ]
})
export class NxBookmarkDownloadModule {}
