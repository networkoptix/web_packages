import { DialogRef } from '@angular/cdk/dialog';
import { signal, effect } from '@angular/core';

export class ModalBase<R> {
    get closable(): boolean {
        return !this.dialogRef.disableClose && !this.busy$$();
    }

    constructor(protected dialogRef: DialogRef<R>, syncCdkWithBusyState: boolean = true) {
        if (syncCdkWithBusyState) {
            effect(() => {
                this.dialogRef.disableClose = this.busy$$();
            });
        }
    }

    /* This will mostly replace manual locking/unlocking */
    busy$$ = signal(false);

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
