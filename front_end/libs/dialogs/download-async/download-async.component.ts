import { Component, Inject } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import {
    ConsoleSection,
    ModalContent,
    ModalManifest,
    ModalType
} from '@components/console-table/console-table.component.types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { CustomClientAPI } from '@services/nx-cloud-api/custom-client-api';
import { WINDOW } from '@services/window-provider';
import { pickFrom } from '@utils/general';

import { PackageProgress } from './download-async.component.types';
import { PackageHandler } from './package-handler';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-modal-download-async',
    templateUrl: 'download-async.component.html',
    styleUrls: ['download-async.component.scss']
})
export class DownloadAsyncModalContent implements ModalContent {
    heading: string;
    modal: ModalType;
    manifest: ModalManifest;
    values: Record<string, any>;

    PACKAGE_PROGRESS = PackageProgress;
    packageHandler: PackageHandler;

    constructor(
        private cloudApi: NxCloudApiService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
        @Inject(WINDOW) private window: Window
    ) {}

    ngOnInit(): void {
        pickFrom(
            this.dialogData,
            ['heading', 'modal', 'manifest', 'values'],
            this
        );

        const apiLookup: Partial<Record<ModalType, ConsoleSection>> = {
            [ModalType.CLIENT_DOWNLOAD]: ConsoleSection.CUSTOM_CLIENTS
        };

        const {
            generatePackage,
            checkPackage,
            getDownloadUrl
        } = this.cloudApi.getSubAPI(apiLookup[this.modal]) as CustomClientAPI;
        this.packageHandler = new PackageHandler(
            this.values.id,
            generatePackage,
            checkPackage,
            getDownloadUrl,
            this.window
        );
        console.log(this);
    }

    close = (result?: string): void => {
        this.dialogRef.close(result);
    };
}
