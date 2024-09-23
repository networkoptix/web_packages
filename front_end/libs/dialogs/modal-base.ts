import { DialogRef } from '@angular/cdk/dialog';
import { effect, signal } from '@angular/core';

export class ModalBase<R> {
    get closable(): boolean {
        return !this.dialogRef.disableClose && !this.busy$$();
    }

    constructor(
        protected dialogRef: DialogRef<R>,
        syncCdkWithBusyState: boolean = true,
    ) {
        if (syncCdkWithBusyState && !this.dialogRef.disableClose) {
            effect(() => {
                this.dialogRef.disableClose = this.busy$$();
            });
        }
    }

    /* Compatibility patch for bannana-in-box with async-action-button for both 17.1 and 17.2+ branches.
    17.1: [(busy)]="busy" (without model)
    17.2+ [(busy)]="busy$$" (with model) */
    busy$$ = signal(false);
    get busy(): boolean {
        return this.busy$$();
    }
    set busy(state: boolean) {
        this.busy$$.set(state);
    }

    lock = (): void => {
        this.dialogRef.disableClose = true;
    };

    unlock = (): void => {
        this.dialogRef.disableClose = false;
    };

    close = (value?: R): void => {
        this.dialogRef.close(value);
    };
}
