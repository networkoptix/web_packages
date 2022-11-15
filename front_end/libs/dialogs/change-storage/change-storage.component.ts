import { Component, Inject, Input } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import staticLang from '@common/language/language_i18n_static.json';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-modal-change-storage',
    templateUrl: 'change-storage.component.html'
})
export class ChangeStorageModalContent {
    @Input() closable: boolean = true;

    CONFIG: IConfig;
    LANG = staticLang;

    system: NxSystem;
    deleteAnalyticsData: Process;
    keepAnalyticsData: Process;

    constructor(
        configService: NxConfigService,
        private processService: NxProcessService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) dialogData: { system: NxSystem }
    ) {
        this.CONFIG = configService.getConfig();
        this.system = dialogData.system;
    }

    ngOnInit(): void {
        this.deleteAnalyticsData = this.processService
            .createProcess(
                () => this.deleteAnalyticsDataProcess(),
                { ignoreError: true },
                () => { this.close('changeOk'); },
                err => {
                    console.error(err);
                    this.close('error');
                }
            );

        this.keepAnalyticsData = this.processService
            .createProcess(
                () => this.keepAnalyticsDataProcess(),
                { ignoreError: true },
                () => { this.close('changeOk'); },
                err => {
                    console.error(err);
                    this.close('error');
                }
            );
    }

    async deleteAnalyticsDataProcess() {
        try {
            const {
                reply: { settings: { metadataStorageChangePolicy } }
            } = await this.system.updateOrGetSystemSettings().toPromise();
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

    dismiss = (): void => {
        this.close('cancel');
    };

    close = (msg?: string): void => {
        this.dialogRef.close(msg);
    };
}
