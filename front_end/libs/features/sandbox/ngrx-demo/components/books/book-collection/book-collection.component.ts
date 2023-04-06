import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Book } from '../../../store/books/book.model';

@Component({
    selector: 'ngrx-demo-book-collection',
    templateUrl: './book-collection.component.html',
    //   styleUrls: ['./book-collection.component.css'],
})
export class NgrxDemoBookCollectionComponent {
    @Input() books: ReadonlyArray<Book> = [];
    @Output() remove = new EventEmitter<string>();
}
