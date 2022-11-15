import { Component, Inject, Input } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import { IEnvironment } from '@environments/environment-config';
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
    LANG = staticLang;
    needsUpdate: boolean;
    system: NxSystem;

    constructor(
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: {
            system: NxSystem;
        },
    ) {
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system'], this);
    }

    close = (msg?: boolean): void => {
        this.dialogRef.close(msg);
    };
}
