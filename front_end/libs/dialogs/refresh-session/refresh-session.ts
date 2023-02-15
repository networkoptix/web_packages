import { Component, Inject, Input } from '@angular/core';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { environment } from '@environments/environment';
import { IEnvironment } from '@environments/environment-config';
import { NxLoginService } from '@services/login.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
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
    CONFIG: IConfig;
    system: NxSystem;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        private loginService: NxLoginService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: {
            system: NxSystem;
        },
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
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
