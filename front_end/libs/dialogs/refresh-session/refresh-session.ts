import { Component, Inject, Input } from '@angular/core';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { environment } from '@environments/environment';
import { IEnvironment } from '@environments/environment-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSystem } from '@services/system.service/system';
import { pickFrom } from '@utils/general';

import { DIALOG_DATA, DialogRef } from '../dialog-ref';

@Component({
    selector: 'nx-modal-refresh-session-content',
    templateUrl: 'refresh-session.html',
    styleUrls: []
})
export class RefreshSessionModalContent {
    @Input() closable: boolean = true;

    readonly environment: IEnvironment = environment;
    LANG: LanguageI18NStaticTypes;
    needsUpdate: boolean;
    system: NxSystem;

    constructor(
        language: NxLanguageProviderService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: {
            system: NxSystem;
        },
    ) {
        this.LANG = language.translations;
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system'], this);
    }

    close = (msg?: boolean): void => {
        this.dialogRef.close(msg);
    };
}
