import {
    Component,
    Inject,
    Input
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxLoginService } from '@services/login.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
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

    CONFIG: IConfig;
    LANG = staticLang;

    system: NxSystem;
    user: NxSystemUser;
    removeUserProcess: Process;
    needsUpdate: boolean;
    dialogTitle: string;
    dialogButtonText: string;

    constructor(
        configService: NxConfigService,
        private loginService: NxLoginService,
        private processService: NxProcessService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system', 'user'], this);

        const msg = this.user.isCloud ? 'remove' : 'delete';
        this.dialogTitle = this.LANG.dialogs.titles[`${msg}User`];
        this.dialogButtonText = this.LANG.dialogs.buttons[msg];

        this.removeUserProcess = this.processService.createProcess(
            () => this.system.deleteUser(this.user),
            {
                ignoreError: true,
                errorPrefix: this.LANG.errorCodes.cantSharePrefix
            },
            () => this.system.getUsers(true).then(() => this.dialogRef.close(true)),
            err => {
                if (
                    err.errorId ===
                    this.CONFIG.servers.errors.oldSessionErrorId
                ) {
                    this.needsUpdate = true;
                    this.loginService.currentSystem = this.system;
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

    close = (): void => {
        this.dialogRef.close();
    };
}
