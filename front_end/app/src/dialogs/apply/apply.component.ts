import {
    Component,
    Inject,
    OnInit,
} from '@angular/core';
import { NgForm } from '@angular/forms';

import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { Process } from '@services/process.service/process';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-apply-content',
    templateUrl: 'apply.component.html',
    styleUrls: []
})
export class ApplyModalContent<Apply extends Process, Discard extends Function> implements OnInit {
    applyFunc: Apply;
    discardFunc: Discard;
    form: NgForm;

    constructor(
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
    }

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

    close = (msg: string = 'canceled'): void => {
        this.dialogRef.close(msg);
    };

    discard = () => {
        this.dialogRef.close('discarded');
        return this.discardFunc?.();
    };
}
