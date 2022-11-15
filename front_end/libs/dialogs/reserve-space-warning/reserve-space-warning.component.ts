import { Component, OnInit } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { DialogRef } from '@dialogs/dialog-ref';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

@Component({
    selector: 'nx-reserve-space-warning',
    templateUrl: 'reserve-space-warning.component.html',
    styleUrls: ['reserve-space-warning.component.scss']
})
export class ReserveSpaceWarningModalContent implements OnInit {
    CONFIG: IConfig;
    LANG = staticLang;

    accepted: boolean = false;
    acceptOverwrite: Process;

    constructor(
        configService: NxConfigService,
        private processService: NxProcessService,
        private dialogRef: DialogRef,
        // @Inject(DIALOG_DATA) private dialogData: never,
    ) {
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
