import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';

import { NxBookmarksCardComponent } from './bookmarks-card.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
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
