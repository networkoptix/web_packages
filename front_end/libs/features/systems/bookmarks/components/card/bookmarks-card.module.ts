import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';

import { NxBookmarksCardComponent } from './bookmarks-card.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        CommonModule,
        LazyLoadImageModule,
    ],
    declarations: [
        NxBookmarksCardComponent,
    ],
    providers: [],
    exports: [
        NxBookmarksCardComponent,
    ]
})
export class NxBookmarksCardModule {}
