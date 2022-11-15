import {
    Component,
    Inject,
    Input
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import type {
    NxSystemUser
} from '@services/system.service/user-manager/user-manager-types';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-remove-user-content',
    templateUrl: 'remove-user.component.html',
    styleUrls: []
})
export class RemoveUserModalContent {
    @Input() closable = true;

    LANG = staticLang;

    system: NxSystem;
    user: NxSystemUser;
    removeUserProcess: Process;
    dialogTitle: string;
    dialogButtonText: string;

    constructor(
        private processService: NxProcessService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system', 'user'], this);

        const msg = this.user.isCloud ? 'remove' : 'delete';
        this.dialogTitle = this.LANG.dialogs.titles[`${msg}User`];
        this.dialogButtonText = this.LANG.dialogs.buttons[msg];

        this.removeUserProcess = this.processService.createProcess(() => {
            return this.system.deleteUser(this.user).then(() => {
                return this.system.getUsers(true);
            });
        }, {
            errorPrefix: this.LANG.errorCodes.cantSharePrefix
        }).then(() => {
            this.dialogRef.close(true);
        });
    }

    close = (): void => {
        this.dialogRef.close();
    };
}
