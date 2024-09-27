import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject, Renderer2 } from '@angular/core';
import { defer, switchMap } from 'rxjs';

import type { CloudStorage as DT } from '@dialogs/dialogs.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
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
    imports: [CloudStorageModule, NxAddSvgSrcDirective],
})
export class CloudStorageMoveModalContent extends BaseCloudStorageActionModalContent {
    override actionType = CloudStorageActionType.MOVE;
    icons = icons;

    constructor(
        configService: NxConfigService,

        public renderer: Renderer2,
        dialogRef: DialogRef<DT['return']>,
        private processService: NxProcessService,
        @Inject(DIALOG_DATA) public override dialogData: DT['data'],
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
