import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
// import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

// import { PipesModule } from '@app/pipes/pipes.module';
// import { ComponentsModule } from '@components/components.module';
// import { SearchModule } from '@components/search/search.module';
// import { DirectivesModule } from '@directives/directives.module';
import { SystemTitleResolver } from '@resolvers/system-title-resolver';

import { NxBookmarksComponent } from './bookmarks.component';
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
        CommonModule,
        TranslateModule,
        RouterModule.forChild(appRoutes),

        NxDateAndTimeFilterModule,
        NxDeviceFilterModule,
        NxTagFilterModule,
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
