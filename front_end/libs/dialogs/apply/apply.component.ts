import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
    Component,
    Inject,
    OnInit,
} from '@angular/core';
import { NgForm } from '@angular/forms';

import { Process } from '@services/process.service/process';
import { pickFrom } from '@utils/general';

import type { Apply as DialogTypes } from '../dialogs.types';

@Component({
    selector: 'nx-modal-apply-content',
    templateUrl: 'apply.component.html',
    styleUrls: []
})
export class ApplyModalContent implements OnInit {
    applyFunc: Process;
    discardFunc?: () => void;
    form: NgForm;

    constructor(
        private dialogRef: DialogRef<DialogTypes['return']>,
        @Inject(DIALOG_DATA) private dialogData: DialogTypes['data'],
    ) {}

    ngOnInit(): void {
        pickFrom(this.dialogData, ['applyFunc', 'discardFunc', 'form'], this);
    }

    apply = (): void => {
        if (this.form) {
            this.form.form.markAllAsTouched();
        }
        this.applyFunc.then(() => {
            this.close('applied');
        }, () => {
            this.close('canceled');
        });
    };

    close = (msg: DialogTypes['return'] = 'canceled'): void => {
        this.dialogRef.close(msg);
    };

    discard = (): void => {
        this.dialogRef.close('discarded');
        return this.discardFunc?.();
    };
}
