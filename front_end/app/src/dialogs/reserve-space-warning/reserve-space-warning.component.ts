import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import type { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';

@Component({
    selector: 'reserve-space-warning',
    templateUrl: 'reserve-space-warning.component.html',
    styleUrls: ['reserve-space-warning.component.scss']
})
export class ReserveSpaceWarningModalContent implements OnInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    accepted: boolean = false;
    acceptOverwrite: Process;

    constructor(
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        configService: NxConfigService,
        language: NxLanguageProviderService,
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.acceptOverwrite = this.processService.createProcess(() => {
            this.activeModal.close('accept');
            return Promise.resolve();
        });
    }
}
