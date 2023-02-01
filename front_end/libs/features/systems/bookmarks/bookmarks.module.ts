import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { NxSimpleSearchModule } from '@components/simple-search/simple-search.module';
import { DirectivesModule } from '@directives/directives.module';
import { SystemTitleResolver } from '@resolvers/system-title-resolver';

import { NxBookmarksComponent } from './bookmarks.component';
import { NxBookmarksCardModule } from './components/card/bookmarks-card.module';
import { NxDateAndTimeFilterModule } from './components/date-and-time-filter/date-and-time-filter.module';
import { NxDeviceFilterModule } from './components/device-filter/device-filter.module';
import { NxTagFilterModule } from './components/tag-filter/tag-filter.module';

const appRoutes: Routes = [
    {
        path: '',
        title: SystemTitleResolver,
        component: NxBookmarksComponent
    }

];

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        CommonModule,
        FormsModule,
        TranslateModule,
        RouterModule.forChild(appRoutes),
        DirectivesModule,
        NxDateAndTimeFilterModule,
        NxDeviceFilterModule,
        NxTagFilterModule,
        NxBookmarksCardModule,
        NxSimpleSearchModule,
        AlertBlockModule,
        PreLoaderModule,
    ],
    providers: [],
    declarations: [
        NxBookmarksComponent
    ],
    bootstrap: [],
    exports: [
        NxBookmarksComponent
    ]
})
export class BookmarksModule {
}
