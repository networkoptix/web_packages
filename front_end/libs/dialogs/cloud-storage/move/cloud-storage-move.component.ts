import {
    Component,
    Renderer2,
    Inject
} from '@angular/core';
import { defer, switchMap } from 'rxjs';

import {
    DIALOG_DATA,
    DialogRef
} from '@dialogs/dialog-ref';
import { icons } from '@lib/variables/static-variables';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';

import { BaseCloudStorageActionModalContent, CloudStorageActionType } from '../action-common/BaseCloudStorageActionModalContent';

@Component({
    selector: 'nx-cloud-storage-modify-content',
    templateUrl: '../action-common/license-input-template.html',
    styleUrls: ['../action-common/styles.scss']
})
export class CloudStorageMoveModalContent extends BaseCloudStorageActionModalContent {
    actionType = CloudStorageActionType.MOVE;
    icons = icons;

    constructor(
        configService: NxConfigService,

        public renderer: Renderer2,
        private dialogRef: DialogRef,
        private processService: NxProcessService,
        @Inject(DIALOG_DATA) public dialogData: Record<string, unknown>,
    ) {
        super();
        this.init();
        this.CONFIG = configService.getConfig();

        this.actionProcess = this.processService.createProcess(
            defer(() => this.cloudStorageManager.move(this.targetSystem.value)).pipe(
                switchMap(() => this.licenseManager.move(this.targetSystem.value, this.license))
            ),
            this.processConfig,
            this.showSuccess,
            this.showErrors
        );
    }

    close = (): void => this.dialogRef.close();
}
