import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApplyModalContent } from '@dialogs/apply/apply.component';
import { DIALOG_SIZE } from '@dialogs/dialog-config-v2';
import { Apply as DialogTypes } from '@dialogs/dialogs.types';
import { Process } from '@services/process.service/process';
import { NxFormGroup } from '@utils/reactive-form-builder';

// TODO: Figure out how to handle multiple forms on a page.

@Injectable({
    providedIn: 'root',
})
export class NxApplyServiceV2 {
    private dialog = inject(Dialog);
    private applyFunction: Process;
    private discardFunction: () => void = () => {};
    private form: NxFormGroup<unknown>;

    private openDialog(): Promise<DialogTypes['return']> {
        return firstValueFrom(
            this.dialog.open<DialogTypes['return'], DialogTypes['data']>(ApplyModalContent, {
                width: DIALOG_SIZE.NORMAL,
                disableClose: true,
                data: { applyFunc: this.applyFunction, discardFunc: this.discardFunction },
            }).closed,
        );
    }

    setGuardFunctions(apply: Process, discard?: () => void): void {
        this.applyFunction = apply;
        this.discardFunction = discard || (() => {});
    }

    setForm<T>(form: NxFormGroup<T>): void {
        this.form = form;
    }

    canMove(): Promise<boolean> {
        return new Promise(resolve => {
            const locked = this.form?.dirty;
            if (locked) {
                return this.openDialog().then(status => {
                    return resolve(status !== 'canceled');
                });
            }
            return resolve(true);
        });
    }
}
