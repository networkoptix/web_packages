import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Renderer2, Inject } from '@angular/core';
import { defer } from 'rxjs';

import type { CloudStorage as DT } from '@dialogs/dialogs.types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { icons } from '@static-variables';

import {
    BaseCloudStorageActionModalContent,
    CloudStorageActionType,
} from '../action-common/BaseCloudStorageActionModalContent';
import { CloudStorageModule } from '../cloud-storage.module';

@Component({
    selector: 'nx-cloud-storage-modify-content',
    templateUrl: '../action-common/license-input-template.component.html',
    styleUrls: ['../action-common/styles.scss'],
    standalone: true,
    imports: [CloudStorageModule],
})
export class CloudStorageModifyModalContent extends BaseCloudStorageActionModalContent {
    actionType = CloudStorageActionType.MODIFY;
    icons = icons;

    constructor(
        configService: NxConfigService,
        public renderer: Renderer2,
        dialogRef: DialogRef<DT['return']>,
        private processService: NxProcessService,
        @Inject(DIALOG_DATA) protected dialogData: DT['data'],
    ) {
        super(dialogRef);
        this.init();
        this.CONFIG = configService.getConfig();
        this.actionProcess = this.processService.createProcess(
            defer(() => {
                this.lock();
                return this.licenseManager.modify(this.license);
            }),
            this.processConfig,
            () => this.showSuccess(true),
            this.showErrors,
        );
    }
}
