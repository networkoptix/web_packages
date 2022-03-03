import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { increment, decrement, reset } from '../../store/counter/counter.actions';
import { selectCount, selectCountSquared } from '../../store/counter/counter.selectors';

@Component({
    selector: 'ngrx-demo-counter',
    templateUrl: 'counter.component.html',
    styleUrls: ['counter.component.scss']
})
export class NgrxDemoCounterComponent {
    count$: Observable<number> = this.store.select(selectCount);
    countSquared$ = this.store.select(selectCountSquared);

    constructor(private store: Store) { }

    increment() {
        this.store.dispatch(increment());
    }

    decrement() {
        this.store.dispatch(decrement());
    }

    reset() {
        this.store.dispatch(reset());
    }
}
