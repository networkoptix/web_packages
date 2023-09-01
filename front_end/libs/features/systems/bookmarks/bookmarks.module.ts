import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSimpleSearchComponent } from '@components/simple-search/simple-search.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
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
        component: NxBookmarksComponent,
    },
];

@NgModule({
    imports: [
        AngularSvgIconModule,
        CommonModule,
        FormsModule,
        TranslateModule,
        RouterModule.forChild(appRoutes),
        NxDateAndTimeFilterModule,
        NxDeviceFilterModule,
        NxTagFilterModule,
        NxBookmarksCardModule,
        NxSimpleSearchComponent,
        NxAlertBlockComponent,
        NxPreLoaderComponent,
        NxPagePlaceholderComponent,
        NxAddSvgSrcDirective,
    ],
    providers: [],
    declarations: [NxBookmarksComponent],
    bootstrap: [],
    exports: [NxBookmarksComponent],
})
export class BookmarksModule {}
