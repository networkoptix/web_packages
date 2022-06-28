import {
    Component,
    Renderer2,
    // Inject
} from '@angular/core';

import {
    // DIALOG_DATA,
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
export class CloudStorageDeleteModalContent extends BaseCloudStorageActionModalContent {
    actionType = CloudStorageActionType.DELETE;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public renderer: Renderer2,
        private dialogRef: DialogRef,
        private processService: NxProcessService,
        // @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        super();
        this.init();
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        // Mock process
        this.actionProcess = this.processService.createProcess(() => Promise.resolve(), {}, this.showSuccess);

        // Mock license
        this.license = this.licenses[0].key;
    }

    close = () => this.dialogRef.close();
}
