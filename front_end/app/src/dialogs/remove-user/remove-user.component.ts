import {
    Component,
    Inject,
    Input
} from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
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

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    system: NxSystem;
    user: NxSystemUser;
    removeUserProcess: Process;
    dialogTitle: string;
    dialogButtonText: string;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private processService: NxProcessService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system', 'user'], this);

        const msg = this.user.isCloud ? 'remove' : 'delete';
        this.dialogTitle = this.LANG.dialogs.titles[`${msg}User`]?.();
        this.dialogButtonText = this.LANG.dialogs.buttons[msg]?.();

        this.removeUserProcess = this.processService.createProcess(() => {
            return this.system.deleteUser(this.user).then(() => {
                return this.system.getUsers(true);
            });
        }, {
            errorPrefix: this.LANG.errorCodes.cantSharePrefix?.()
        }).then(() => {
            this.dialogRef.close(true);
        });
    }

    close = () => {
        this.dialogRef.close();
    };
}
