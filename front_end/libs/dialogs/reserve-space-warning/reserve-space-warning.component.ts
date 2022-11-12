import { Component, OnInit } from '@angular/core';

import type { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { DialogRef } from '@dialogs/dialog-ref';
import { icons } from '@lib/variables/static-variables';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

@Component({
    selector: 'nx-reserve-space-warning',
    templateUrl: 'reserve-space-warning.component.html',
    styleUrls: ['reserve-space-warning.component.scss']
})
export class ReserveSpaceWarningModalContent implements OnInit {
    LANG: LanguageI18NStaticTypes;

    accepted: boolean = false;
    acceptOverwrite: Process;
    icons = icons;

    constructor(
        private processService: NxProcessService,
        language: NxLanguageProviderService,
        private dialogRef: DialogRef,
        // @Inject(DIALOG_DATA) private dialogData: never,
    ) {
        this.LANG = language.translations;
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
