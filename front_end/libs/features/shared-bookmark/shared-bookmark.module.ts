import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedBookmarkComponent } from './shared-bookmark.component';

const appRoutes: Routes = [
    {
        path: '',
        redirectTo: '/',
        pathMatch: 'full',
    },
    {
        path: ':systemId',
        redirectTo: '/',
        pathMatch: 'full',
    },
    {
        path: ':systemId/:bookmarkId',
        // TODO: title?
        title: '',
        component: SharedBookmarkComponent,
    },
];

@NgModule({
    imports: [RouterModule.forChild(appRoutes), SharedBookmarkComponent],
    providers: [],
    declarations: [],
    bootstrap: [],
    exports: [],
})
export class SharedBookmarkModule {}
