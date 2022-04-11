import { Component, Inject } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import {
    ConsoleSection,
    ModalContent,
    ModalManifest,
    ModalType
} from '@components/console-table/console-table.component.types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { CustomClientAPI, NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
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

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private cloudApi: NxCloudApiService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.config;
    }

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

    close = (result?: string) => {
        this.dialogRef.close(result);
    };
}
