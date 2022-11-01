import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { SearchModule } from '@components/search/search.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxBookmarksComponent } from './bookmarks.component';
import { BookmarksListModule } from './list/list.module';

const appRoutes: Routes = [
    {
        path: '',
        component: NxBookmarksComponent
    }

];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        FormsModule,
        BookmarksListModule,
        RouterModule.forChild(appRoutes),
        SearchModule
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
