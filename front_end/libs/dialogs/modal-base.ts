import { DialogRef } from '@angular/cdk/dialog';

export class ModalBase<R> {
    get closable(): boolean {
        return !this.dialogRef.disableClose;
    }

    constructor(protected dialogRef: DialogRef<R>) {}

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
