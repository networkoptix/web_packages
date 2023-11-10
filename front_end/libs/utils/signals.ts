import { effect, EventEmitter, Signal } from '@angular/core';

/**
 * A class that binds signals to component outputs.
 * @param signal$$ - A signal that you want to emit on change.
 * @param skipFirstIfUndefined - prevents the signal's initial value from emitting.
 */
export class SignalEventEmitter<T> extends EventEmitter<T> {
    constructor(signal$$: Signal<T>, skipFirstIfUndefined = true) {
        super();
        effect(
            () => {
                const value = signal$$();
                if (value || !skipFirstIfUndefined) {
                    this.emit(value);
                }
                skipFirstIfUndefined = false;
            },
            { allowSignalWrites: true },
        );
    }
}
