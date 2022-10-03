import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy } from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem } from '@services/system.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-modal-change-storage',
    templateUrl: 'change-storage.component.html'
})
export class ChangeStorageModalContent {
    @Input() system: NxSystem;
    @Input() closable: boolean;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    deleteAnalyticsData: Process;
    keepAnalyticsData: Process;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnInit() {
        this.deleteAnalyticsData = this.processService
            .createProcess(
                () => this.deleteAnalyticsDataProcess(),
                { ignoreError: true },
                () => { this.activeModal.close('changeOk'); },
                err => {
                    console.error(err);
                    this.activeModal.close('error');
                }
            );

        this.keepAnalyticsData = this.processService
            .createProcess(
                () => this.keepAnalyticsDataProcess(),
                { ignoreError: true },
                () => { this.activeModal.close('changeOk'); },
                err => {
                    console.error(err);
                    this.activeModal.close('error');
                }
            );
    }

    async deleteAnalyticsDataProcess() {
        try {
            const {
                reply: { settings: { metadataStorageChangePolicy } }
            }  = await this.system.updateOrGetSystemSettings().toPromise();
            if (metadataStorageChangePolicy !== 'remove') {
                await this.system.updateOrGetSystemSettings({
                    metadataStorageChangePolicy: 'remove'
                }).toPromise();
            }
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async keepAnalyticsDataProcess() {
        try {
            const {
                reply: { settings: { metadataStorageChangePolicy } }
            } = await this.system.updateOrGetSystemSettings().toPromise();
            if (metadataStorageChangePolicy !== 'keep') {
                await this.system.updateOrGetSystemSettings({
                    metadataStorageChangePolicy: 'keep'
                }).toPromise();
            }
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    close = () => {
        this.activeModal.close('cancel');
    }
}
