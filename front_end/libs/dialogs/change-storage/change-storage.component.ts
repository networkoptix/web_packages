import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import type { ChangeStorage as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-modal-change-storage',
    templateUrl: 'change-storage.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class ChangeStorageModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    deleteAnalyticsData: Process;
    keepAnalyticsData: Process;

    constructor(
        processService: NxProcessService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private system: DT['data'],
    ) {
        super(dialogRef);

        this.deleteAnalyticsData = processService.createProcess(
            () => this.deleteAnalyticsDataProcess(),
            { ignoreError: true },
            () => {
                this.close('changeOk');
            },
            err => {
                console.error(err);
                this.close('error');
            },
        );

        this.keepAnalyticsData = processService.createProcess(
            () => this.keepAnalyticsDataProcess(),
            { ignoreError: true },
            () => {
                this.close('changeOk');
            },
            err => {
                console.error(err);
                this.close('error');
            },
        );
    }

    private async deleteAnalyticsDataProcess(): Promise<void> {
        this.lock();
        try {
            const {
                reply: {
                    settings: { metadataStorageChangePolicy },
                },
            } = await firstValueFrom(this.system.updateOrGetSystemSettings());
            if (metadataStorageChangePolicy !== 'remove') {
                await firstValueFrom(
                    this.system.updateOrGetSystemSettings({
                        metadataStorageChangePolicy: 'remove',
                    }),
                );
            }
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    private async keepAnalyticsDataProcess(): Promise<void> {
        this.lock();
        try {
            const {
                reply: {
                    settings: { metadataStorageChangePolicy },
                },
            } = await firstValueFrom(this.system.updateOrGetSystemSettings());
            if (metadataStorageChangePolicy !== 'keep') {
                await this.system
                    .updateOrGetSystemSettings({
                        metadataStorageChangePolicy: 'keep',
                    })
                    .toPromise();
            }
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    dismiss = (): void => {
        this.close('cancel');
    };
}
