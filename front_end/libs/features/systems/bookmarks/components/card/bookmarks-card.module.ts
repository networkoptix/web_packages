import { AsyncPipe } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';

import { NxBookmarksCardComponent } from './bookmarks-card.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        LazyLoadImageModule,
        AsyncPipe
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
