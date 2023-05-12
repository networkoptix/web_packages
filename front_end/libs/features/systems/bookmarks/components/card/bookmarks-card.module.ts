import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { LazyLoadImageModule } from 'ng-lazyload-image';

import { MultiLineEllipsisModule } from '@components/multi-line-ellipsis/mle.module';
import { PlayerPlaceholderModule } from '@components/placeholders/player/player-placeholder.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxBookmarksCardComponent } from './bookmarks-card.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        CommonModule,
        LazyLoadImageModule,
        MultiLineEllipsisModule,
        PipesModule,
        PreLoaderModule,
        PlayerPlaceholderModule,
        DirectivesModule,
        TranslateModule
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
