import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

import type { RemoveUser as DialogTypes } from '../dialogs.types';

@Component({
    selector: 'nx-modal-remove-user-content',
    templateUrl: 'remove-user.component.html',
    styleUrls: []
})
export class RemoveUserModalContent {
    LANG = staticLang;

    removeUserProcess: Process;
    dialogTitle: string;
    dialogButtonText: string;

    constructor(
        private processService: NxProcessService,
        public dialogRef: DialogRef<DialogTypes['return']>,
        @Inject(DIALOG_DATA) private dialogData: DialogTypes['data'],
    ) {
    }

    ngOnInit(): void {
        const { user, system } = this.dialogData;
        const msg = user.isCloud ? 'remove' : 'delete';
        this.dialogTitle = this.LANG.dialogs.titles[`${msg}User`];
        this.dialogButtonText = this.LANG.dialogs.buttons[msg];

        this.removeUserProcess = this.processService.createProcess(() => {
            this.dialogRef.disableClose = true;
            return system.userManager.deleteUser(user)
                .then(() => system.getUsers(true));
        }, {
            errorPrefix: this.LANG.errorCodes.cantSharePrefix
        }, () => {
            this.close(true);
            this.unlock();
        }, () => {
            this.unlock();
        });
    }

    close = (result?: DialogTypes['return']): void => {
        this.dialogRef.close(result);
    };

    unlock = (): void => {
        this.dialogRef.disableClose = false;
    };
}
