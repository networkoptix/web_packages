import { NgModule }                      from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { RouterModule, Routes }          from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';

import { ComponentsModule }              from '@components/components.module';
import { BookmarksListModule }           from './list/list.module';
import { DirectivesModule }              from '@directives/directives.module';
import { NxBookmarksComponent }          from './bookmarks.component';
import { PipesModule }                   from '@src/pipes/pipes.module';

const appRoutes: Routes = [
    {
        path      : '',
        component : NxBookmarksComponent
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
        RouterModule.forChild(appRoutes)
    ],
    providers    : [],
    declarations : [
        NxBookmarksComponent
    ],
    bootstrap : [],
    exports   : [
        NxBookmarksComponent
    ]
})
export class BookmarksModule {
}
