import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Renderer2, Inject } from '@angular/core';
import { defer, switchMap } from 'rxjs';

import type { CloudStorage as DT } from '@dialogs/dialogs.types';
import { icons } from '@lib/variables/static-variables';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';

import {
    BaseCloudStorageActionModalContent,
    CloudStorageActionType,
} from '../action-common/BaseCloudStorageActionModalContent';

@Component({
    selector: 'nx-cloud-storage-modify-content',
    templateUrl: '../action-common/license-input-template.component.html',
    styleUrls: ['../action-common/styles.scss'],
})
export class CloudStorageMoveModalContent extends BaseCloudStorageActionModalContent {
    actionType = CloudStorageActionType.MOVE;
    icons = icons;

    constructor(
        configService: NxConfigService,

        public renderer: Renderer2,
        dialogRef: DialogRef<DT['return']>,
        private processService: NxProcessService,
        @Inject(DIALOG_DATA) public dialogData: DT['data'],
    ) {
        super(dialogRef);
        this.init();
        this.CONFIG = configService.getConfig();

        this.actionProcess = this.processService.createProcess(
            defer(() => {
                this.lock();
                return this.cloudStorageManager.move(this.targetSystem.value);
            }).pipe(
                switchMap(() => this.licenseManager.move(this.targetSystem.value, this.license)),
            ),
            this.processConfig,
            this.showSuccess,
            this.showErrors,
        );
    }
}
