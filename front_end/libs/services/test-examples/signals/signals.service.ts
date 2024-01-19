import { Injectable, signal, computed, effect } from '@angular/core';
import { v4 as uuid } from 'uuid';

@Injectable({
    providedIn: 'root',
})
export class SignalsServiceExample {
    seed$$ = signal(uuid());
    state$$ = signal(uuid());
    sideEffect = uuid();
    computed$$ = computed(() => `${this.state$$()}${this.seed$$()}`);

    constructor() {
        effect(() => {
            this.sideEffect = this.state$$();
        });
    }
}
