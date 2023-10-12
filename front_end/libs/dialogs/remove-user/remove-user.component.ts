import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { UserType } from '@services/system-user.types';
import { NxToastService } from '@services/toast.service';

import type { RemoveUser as DT } from '../dialogs.types';

@Component({
    selector: 'nx-modal-remove-user-content',
    templateUrl: 'remove-user.component.html',
    styleUrls: [],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,

        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class RemoveUserModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    removeUserProcess: Process;
    dialogTitle: string;
    dialogButtonText: string;

    constructor(
        private processService: NxProcessService,
        private toastService: NxToastService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private dialogData: DT['data'],
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {
        const { user, system } = this.dialogData;
        const msg = user.type === UserType.cloud ? 'remove' : 'delete';
        this.dialogTitle = this.LANG.dialogs.titles[`${msg}User`];
        this.dialogButtonText = this.LANG.dialogs.buttons[msg];

        this.removeUserProcess = this.processService.createProcess(
            () => {
                this.lock();
                return system.userManager.deleteUser(user);
            },
            {
                errorPrefix: this.LANG.errorCodes.cantSharePrefix,
                ignoreError: true,
            },
            () => {
                system.getUsers(true).then(() => this.dialogRef.close(true));
                this.close(true);
            },
            () => {
                this.toastService.notify(
                    this.LANG.dialogs.updateSession.removeUser,
                    ToastType.Warning,
                );
                this.unlock();
            },
        );
    }
}
