import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxFilterContainerComponent } from '@components/filters/filter-container/filter-container.component';
import { NxCheckboxFilterItemComponent } from '@components/filters/filter-items/checkbox-filter-item/checkbox-filter-item.component';
import { NxChipFilterItemComponent } from '@components/filters/filter-items/chip-filter-item/chip-filter-item.component';
import { NxRadioFilterItemComponent } from '@components/filters/filter-items/radio-filter-item/radio-filter-item.component';
import { NxMultiFilterComponent } from '@components/filters/multi-filter.component';
import { NxSingleFilterComponent } from '@components/filters/single-filter.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxPagePlaceholderGenericComponent } from '@components/placeholdersV2/generic-page-placeholder.component';
import { NxPagePlaceholderOfflineComponent } from '@components/placeholdersV2/offline/offline-page-placeholder.component';
import { NxSimpleSearchComponent } from '@components/simple-search/simple-search.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxIntersectionObserver } from '@directives/nx-intersection.directive';
import { DummyBookmarkComponent } from '@pages/systems/bookmarks/components/dummy-bookmark/dummy-bookmark.component';
import { SystemTitleResolver } from '@resolvers/system-title-resolver';
import { NxMenuProjectionDirective } from 'nx-components';

import { NxBookmarksComponent } from './bookmarks.component';
import { NxBookmarksCardModule } from './components/card/bookmarks-card.module';
import { NxDateAndTimeFilterModule } from './components/date-and-time-filter/date-and-time-filter.module';

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
        NxBookmarksCardModule,
        NxSimpleSearchComponent,
        NxAlertBlockComponent,
        NxPreLoaderComponent,
        NxAddSvgSrcDirective,
        NxIntersectionObserver,
        DummyBookmarkComponent,
        NxFilterContainerComponent,
        NxSingleFilterComponent,
        NxMultiFilterComponent,
        NxChipFilterItemComponent,
        NxCheckboxFilterItemComponent,
        NxRadioFilterItemComponent,
        NxMenuProjectionDirective,
        NxPagePlaceholderGenericComponent,
        NxPagePlaceholderOfflineComponent,
    ],
    providers: [],
    declarations: [NxBookmarksComponent],
    bootstrap: [],
    exports: [NxBookmarksComponent],
})
export class BookmarksModule {}
