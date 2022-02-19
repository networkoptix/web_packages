import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';

import { NgrxDemoBookCollectionComponent } from './components/books/book-collection/book-collection.component';
import { NgrxDemoBookListComponent } from './components/books/book-list/book-list.component';
import { NgrxDemoBooksComponent } from './components/books/books.component';
import { NgrxDemoCounterComponent } from './components/counter/counter.component';
import { NgrxDemoGroupListComponent } from './components/groups/group-list/group-list.component';
import { NgrxDemoGroupsComponent } from './components/groups/groups.component';
import { booksReducer } from './store/books/books.reducer';
import { collectionReducer } from './store/books/collection.reducer';
import { counterReducer } from './store/counter/counter.reducer';
import { groupsReducer } from './store/groups/groups.reducer';

const appRoutes: Routes = [
    {
        path: 'counter',
        component: NgrxDemoCounterComponent,
    },
    {
        path: 'books',
        component: NgrxDemoBooksComponent,
    },
    {
        path: 'groups',
        component: NgrxDemoGroupsComponent,
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),

        StoreModule.forFeature('count', counterReducer),

        StoreModule.forFeature('books', booksReducer),
        StoreModule.forFeature('collection', collectionReducer),

        StoreModule.forFeature('groups', groupsReducer),
    ],
    providers: [
    ],
    declarations: [
        NgrxDemoCounterComponent,

        NgrxDemoBookListComponent,
        NgrxDemoBookCollectionComponent,
        NgrxDemoBooksComponent,

        NgrxDemoGroupListComponent,
        NgrxDemoGroupsComponent,
    ],
    bootstrap: [
    ],
    exports: [
    ]
})
export class NgrxDemoModule {
}
