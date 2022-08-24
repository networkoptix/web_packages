import {
    Component,
    Renderer2,
    Inject
} from '@angular/core';
import { defer } from 'rxjs';

import {
    DIALOG_DATA,
    DialogRef
} from '@dialogs/dialog-ref';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';

import { BaseCloudStorageActionModalContent, CloudStorageActionType } from '../action-common/BaseCloudStorageActionModalContent';

@Component({
    selector: 'nx-cloud-storage-modify-content',
    templateUrl: '../action-common/license-input-template.html',
    styleUrls: ['../action-common/styles.scss']
})
export class CloudStorageModifyModalContent extends BaseCloudStorageActionModalContent {
    actionType = CloudStorageActionType.MODIFY;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public renderer: Renderer2,
        private dialogRef: DialogRef,
        private processService: NxProcessService,
        @Inject(DIALOG_DATA) protected dialogData: Record<string, unknown>,
    ) {
        super();
        this.init();
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        this.actionProcess = this.processService.createProcess(defer(() => this.licenseManager.modify(this.license)), this.processConfig, this.showSuccess, this.showErrors);
    }

    close = (): void => this.dialogRef.close();
}
