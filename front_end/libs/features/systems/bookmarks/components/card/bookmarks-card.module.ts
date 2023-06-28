import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';

import { NxMultiLineEllipsisComponent } from '@components/multi-line-ellipsis/mle.component';
import { NxPlayerPlaceholderComponent } from '@components/placeholders/player/player-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxBookmarksCardComponent } from './bookmarks-card.component';

@NgModule({
    imports: [
        AngularSvgIconModule,
        CommonModule,
        LazyLoadImageModule,
        NxMultiLineEllipsisComponent,
        PipesModule,
        NxPreLoaderComponent,
        NxPlayerPlaceholderComponent,
        DirectivesModule,
        TranslateModule,
    ],
    declarations: [NxBookmarksCardComponent],
    providers: [],
    exports: [NxBookmarksCardComponent],
})
export class NxBookmarksCardModule {}
