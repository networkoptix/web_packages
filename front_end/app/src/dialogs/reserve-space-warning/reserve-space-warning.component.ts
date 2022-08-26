import { Component, OnInit } from '@angular/core';

import type { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DialogRef } from '@dialogs/dialog-ref';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

@Component({
    selector: 'nx-reserve-space-warning',
    templateUrl: 'reserve-space-warning.component.html',
    styleUrls: ['reserve-space-warning.component.scss']
})
export class ReserveSpaceWarningModalContent implements OnInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    accepted: boolean = false;
    acceptOverwrite: Process;

    constructor(
        private processService: NxProcessService,
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private dialogRef: DialogRef,
        // @Inject(DIALOG_DATA) private dialogData: never,
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.acceptOverwrite = this.processService.createProcess(() => {
            this.dialogRef.close('accept');
            return Promise.resolve();
        });
    }

    close = (): void => {
        this.dialogRef.close();
    };
}
