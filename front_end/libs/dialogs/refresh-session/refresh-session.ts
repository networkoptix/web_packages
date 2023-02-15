import { Component, Inject, Input } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import { IEnvironment } from '@environments/environment-config';
import { NxLoginService } from '@services/login.service';
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
        private loginService: NxLoginService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: {
            system: NxSystem;
        },
    ) {
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system'], this);
        if (this.system.mediaserver.isSessionOauth) {
            this.loginService.currentSystem = this.system;
            this.loginService.updateSession('renewWeb')
                .then(this.close)
                .catch(() => this.close(false));
        }
    }

    close = (msg?: boolean): void => {
        this.dialogRef.close(msg);
    };
}
