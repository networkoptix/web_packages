import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Book } from '../../../store/books/book.model';

@Component({
    selector: 'ngrx-demo-book-list',
    templateUrl: './book-list.component.html',
    // styleUrls: ['./book-list.component.css'],
})
export class NgrxDemoBookListComponent {
  @Input() books: ReadonlyArray<Book> = [];
  @Output() add = new EventEmitter<string>();
}
