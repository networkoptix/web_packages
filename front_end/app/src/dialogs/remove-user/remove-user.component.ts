import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';

@Component({
    selector: 'nx-modal-remove-user-content',
    templateUrl: 'remove-user.component.html',
    styleUrls: []
})
export class RemoveUserModalContent {
    @Input() system;
    @Input() user;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    removeUserProcess: Process;
    dialogTitle: string;
    dialogButtonText: string;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit() {
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
            this.activeModal.close(true);
        });
    }

    close() {
        this.activeModal.close();
    }
}
