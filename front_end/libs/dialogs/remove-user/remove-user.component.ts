import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { ModalBase } from '@dialogs/modal-base';
import { servers } from '@lib/variables/static-variables';
import { NxLoginService } from '@services/login.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystem } from '@services/system.service/system';

import type { RemoveUser as DT } from '../dialogs.types';

@Component({
    selector: 'nx-modal-remove-user-content',
    templateUrl: 'remove-user.component.html',
    styleUrls: []
})
export class RemoveUserModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;
    system: NxSystem;

    removeUserProcess: Process;
    needsUpdate: boolean;
    dialogTitle: string;
    dialogButtonText: string;

    constructor(
        private loginService: NxLoginService,
        private processService: NxProcessService,
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
            this.unlock();
            if (
                err.errorId ===
                servers.errors.oldSessionErrorId
            ) {
                this.needsUpdate = true;
                this.loginService.currentSystem = system;
                this.loginService.updateSession('renewWeb')
                    .then(ready => {
                        this.needsUpdate = !ready;
                        if (ready) {
                            this.removeUserProcess.run();
                        }
                    });
            }
        });
    }
}
