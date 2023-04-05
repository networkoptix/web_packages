import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { ModalBase } from '@dialogs/modal-base';
import { SessionState } from '@dialogs/update-session/update-session.component.types';
import { servers } from '@lib/variables/static-variables';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystem } from '@services/system.service/system';

import type { RemoveUser as DT } from '../dialogs.types';

@Component({
    selector: 'nx-modal-remove-user-content',
    templateUrl: 'remove-user.component.html',
    styleUrls: [],
})
export class RemoveUserModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;
    system: NxSystem;

    removeUserProcess: Process;
    dialogTitle: string;
    dialogButtonText: string;

    constructor(
        private processService: NxProcessService,
        private dialogs: NxDialogsService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private dialogData: DT['data'],
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {
        const { user, system } = this.dialogData;
        this.system = system;
        const msg = user.isCloud ? 'remove' : 'delete';
        this.dialogTitle = this.LANG.dialogs.titles[`${msg}User`];
        this.dialogButtonText = this.LANG.dialogs.buttons[msg];

        this.removeUserProcess = this.processService.createProcess(() => {
            this.lock();
            return system.userManager.deleteUser(user);
        }, {
            errorPrefix: this.LANG.errorCodes.cantSharePrefix,
            ignoreError: true
        }, () => {
            system.getUsers(true).then(() => this.dialogRef.close(true));
            this.close(true);
        }, err => {
            if (err.errorId === servers.errors.oldSessionErrorId) {
                this.dialogs.updateSession({
                    sessionState: SessionState.RenewWeb,
                    system: this.system,
                    openingRef: this.dialogRef,
                    processAction: 'danger',
                }).then(ready => {
                    if (ready) {
                        this.removeUserProcess.run();
                    } else {
                        this.unlock();
                    }
                });
            } else {
                this.unlock();
            }
        });
    }
}
