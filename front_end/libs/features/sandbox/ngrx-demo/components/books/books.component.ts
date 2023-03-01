import { Component } from '@angular/core';
import { Store } from '@ngrx/store';

import { retrievedBookList, addBook, removeBook } from '../../store/books/books.actions';
import { selectBookCollection, selectBooks } from '../../store/books/books.selectors';
import { GoogleBooksService } from '../../store/books/books.service';

@Component({
    selector: 'ngrx-demo-books',
    templateUrl: './books.component.html',
})
export class NgrxDemoBooksComponent {
    books$ = this.store.select(selectBooks);
    bookCollection$ = this.store.select(selectBookCollection);

    onAdd(bookId: string): void {
        this.store.dispatch(addBook({ bookId }));
    }

    onRemove(bookId: string): void {
        this.store.dispatch(removeBook({ bookId }));
    }

    constructor(private booksService: GoogleBooksService, private store: Store) {}

    ngOnInit(): void {
        this.booksService
            .getBooks()
            .subscribe(books => this.store.dispatch(retrievedBookList({ books })));
    }
}
