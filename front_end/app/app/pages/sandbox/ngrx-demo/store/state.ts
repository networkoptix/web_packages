import { Book } from './books/book.model';
import { GroupsState } from './groups/groups.state';

export interface AppState {
    count: number;

    books: ReadonlyArray<Book>;
    collection: ReadonlyArray<string>;

    groups: GroupsState;
}
