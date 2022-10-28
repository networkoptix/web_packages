import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';

import { NgrxDemoBookCollectionComponent } from './components/books/book-collection/book-collection.component';
import { NgrxDemoBookListComponent } from './components/books/book-list/book-list.component';
import { NgrxDemoBooksComponent } from './components/books/books.component';
import { NgrxDemoCounterComponent } from './components/counter/counter.component';
import { booksReducer } from './store/books/books.reducer';
import { collectionReducer } from './store/books/collection.reducer';
import { counterReducer } from './store/counter/counter.reducer';

const appRoutes: Routes = [
    {
        path: 'counter',
        component: NgrxDemoCounterComponent,
    },
    {
        path: 'books',
        component: NgrxDemoBooksComponent,
    },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),

        StoreModule.forFeature('count', counterReducer),

        StoreModule.forFeature('books', booksReducer),
        StoreModule.forFeature('collection', collectionReducer),
    ],
    providers: [
    ],
    declarations: [
        NgrxDemoCounterComponent,

        NgrxDemoBookListComponent,
        NgrxDemoBookCollectionComponent,
        NgrxDemoBooksComponent,
    ],
    bootstrap: [
    ],
    exports: [
    ]
})
export class NgrxDemoModule {
}
