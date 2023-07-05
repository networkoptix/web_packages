import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject, OnInit } from '@angular/core';

import { Process } from '@services/process.service/process';
import { assignFrom } from '@utils/general';

import type { Apply as DialogTypes } from '../dialogs.types';

@Component({
    selector: 'nx-modal-apply-content',
    templateUrl: 'apply.component.html',
    styleUrls: [],
})
export class ApplyModalContent implements OnInit {
    applyFunc: Process;
    discardFunc?: () => void;
    isApplyDisabled?: boolean = false;

    constructor(
        private dialogRef: DialogRef<DialogTypes['return']>,
        @Inject(DIALOG_DATA) private dialogData: DialogTypes['data'],
    ) {}

    ngOnInit(): void {
        assignFrom(this.dialogData, ['applyFunc', 'discardFunc', 'isApplyDisabled'], this);
    }

    apply = (): void => {
        this.applyFunc.then(
            () => {
                this.close('applied');
            },
            () => {
                this.close('canceled');
            },
        );
    };

    close = (msg: DialogTypes['return'] = 'canceled'): void => {
        this.dialogRef.close(msg);
    };

    discard = (): void => {
        this.dialogRef.close('discarded');
        return this.discardFunc?.();
    };
}
