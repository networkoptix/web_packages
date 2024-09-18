import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject, Renderer2 } from '@angular/core';
import { defer } from 'rxjs';

import type { CloudStorage as DT } from '@dialogs/dialogs.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { icons } from '@static-variables';

import {
    BaseCloudStorageActionModalContent,
    CloudStorageActionType,
} from '../action-common/BaseCloudStorageActionModalContent';
import { CloudStorageModule } from '../cloud-storage.module';

@Component({
    selector: 'nx-cloud-storage-activate-content',
    templateUrl: '../action-common/license-input-template.component.html',
    styleUrls: ['../action-common/styles.scss'],
    standalone: true,
    imports: [CloudStorageModule, NxAddSvgSrcDirective, NxFocusMeDirective],
})
export class CloudStorageActivateModalContent extends BaseCloudStorageActionModalContent {
    override actionType = CloudStorageActionType.ACTIVATE;
    icons = icons;

    constructor(
        configService: NxConfigService,

        public renderer: Renderer2,
        dialogRef: DialogRef<DT['return']>,
        private processService: NxProcessService,
        @Inject(DIALOG_DATA) protected override dialogData: DT['data'],
    ) {
        super(dialogRef);
        this.init();
        this.CONFIG = configService.getConfig();

        this.actionProcess = this.processService.createProcess(
            defer(() => {
                this.lock();
                return this.licenseManager.activate(this.license);
            }),
            this.processConfig,
            () => this.showSuccess(true),
            this.showErrors,
        );
    }
}
