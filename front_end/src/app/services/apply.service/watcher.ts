
import { NgForm } from '@angular/forms';
import { isEqual } from 'lodash-es';
import { BehaviorSubject } from 'rxjs';

/**
 * Allows making subscriptions to variables similar to $watch from AngularJS.
 * Usage:
 * >
 * const someVar = new Watcher<any>;
 * someVar.subscribe((data) => {
 * >>
 * doSomething();
 * >
 * });
 * someVar.value = {data: 'test'};
 * @class
 */
export class Watcher<T extends any, Owner = any> {
    originalValue: T;
    valueSubject = new BehaviorSubject<T>(undefined);
    identity: symbol;

    constructor(value?: T, public owner: Owner = null, identifier = 'Watcher') {
        this.value = value;
        this.identity = Symbol(identifier);
    }

    get value(): T {
        return this.valueSubject.getValue();
    }

    set value(data) {
        if (this.value === undefined) {
            this.originalValue = data;
        }
        if (this.value !== data) {
            this.valueSubject.next(data);
        }
    }

    get changed(): boolean {
        return this.originalValue !== this.value;
    }

    // Resets the value of the watcher to the first value that was not undefined.
    reset = (): void => {
        this.valueSubject.next(this.originalValue);
    };

    static extendedWatcherFactory<T extends any, Extended extends { [key: string]: any }>(
        value: T, extendedProperties: Extended
    ) {
        const watcher = new Watcher(value) as Watcher<T> & Extended;
        Object.assign(watcher, extendedProperties);
        return watcher;
    }
}

/**
 * Section watcher that that is api compatible with watcher.
 */
export class SectionWatcher {
    originalValue;
    valueSubject = new BehaviorSubject(undefined);
    identity: symbol;

    constructor(
        public watchers: Watcher<any>[],
        public owner: any = null,
        identifier = 'Section Watcher'
    ) {
        this.watchers.forEach(watcher => {
            watcher.valueSubject.subscribe(_ => {
                this.updateHash();
            });
        });
        this.identity = Symbol(identifier);
    }

    get value(): string {
        return this.watchers.reduce((acc, cur) => acc.concat(cur.value), '');
    }

    set value(data) {
        if (this.value === undefined) {
            this.originalValue = data;
        }
        if (this.value !== data) {
            this.valueSubject.next(data);
        }
        this.watchers.forEach(watcher => {
            watcher.value = data;
        });
    }

    get changed(): boolean {
        return this.watchers.some(watcher => watcher.changed);
    }

    private updateHash = (): void => {
        this.valueSubject.next(this.value);
    };

    reset = (): void => {
        this.watchers.forEach(watcher => watcher.reset());
    };
}

export class FormWatcher {
    originalValue;
    valueSubject = new BehaviorSubject(false);
    changed: boolean;
    identity: symbol;

    get value() {
        return this.valueSubject.value;
    }

    constructor(
        private form: NgForm,
        public owner: any = null,
        identifier = 'Form Watcher'
    ) {
        form.valueChanges.subscribe(change => {
            if (
                !this.originalValue ||
                Object.keys(this.originalValue).length < Object.keys(change).length
            ) {
                this.originalValue = change;
                this.changed = false;
                this.valueSubject.next(change);
            } else {
                this.changed = !isEqual(this.originalValue, change);
                this.valueSubject.next(change);
            }
        });
        this.identity = Symbol(identifier);
    }

    hardReset = (): void => {
        const { value } = this.valueSubject;
        Object.assign(this.originalValue, value);
        this.form.reset(value);
    };

    reset = (): void => {
        this.valueSubject.next(this.originalValue);
        this.form.reset(this.originalValue);
    };

    saved = (): void => {
        this.originalValue = this.value;
        this.changed = false;
        this.reset();
    };
}
