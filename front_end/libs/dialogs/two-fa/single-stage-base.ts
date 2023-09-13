import { DialogRef } from '@angular/cdk/dialog';

import { ModalBase } from '@dialogs/modal-base';

import { Nx2faCodeInputComponent } from './code-input/2fa-code-input.component';

export abstract class NxSingleStage2faModalBase<R> extends ModalBase<R> {
    protected abstract tfaCodeInput: Nx2faCodeInputComponent;

    constructor(dialogRef: DialogRef<R>) {
        super(dialogRef);
    }

    override lock = (): void => {
        this.dialogRef.disableClose = true;
        this.tfaCodeInput.disable();
    };

    override unlock = (): void => {
        this.dialogRef.disableClose = false;
        this.tfaCodeInput.enable();
    };
}
