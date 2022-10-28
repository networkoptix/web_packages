import { Book } from './books/book.model';

export interface AppState {
    count: number;

    books: ReadonlyArray<Book>;
    collection: ReadonlyArray<string>;
}
