import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ClipComponent } from '@components/clip/clip.component';

import { SharedBookmarkViewerComponent } from './shared-bookmark-viewer/shared-bookmark-viewer.component';
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
    imports: [CommonModule, RouterModule.forChild(appRoutes), TranslateModule, ClipComponent],
    providers: [],
    declarations: [SharedBookmarkComponent, SharedBookmarkViewerComponent],
    bootstrap: [],
    exports: [SharedBookmarkComponent],
})
export class SharedBookmarkModule {}
