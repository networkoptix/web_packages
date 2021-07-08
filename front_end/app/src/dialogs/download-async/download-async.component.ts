import { Component, Inject, Input }            from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy }                from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';
import {
    ConsoleSection,
    ModalContent, ModalManifest, ModalType
}                                    from '@pages/developer-console/console/table/console-table.component';
import { CustomClientAPI, NxCloudApiService }         from '@services/nx-cloud-api';
import { interval, Observable, Subject } from 'rxjs';
import { filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { WINDOW } from '@services/window-provider';

export enum PackageProgress {
    STARTING,
    GENERATING,
    DOWNLOAD_READY,
    PACKAGE_ERROR
}

export enum PackageState {
    PENDING='pending',
    READY='ready',
    FAILED='failed'
}

export interface PackageStatus {
    state: PackageState,
    message?: string,
    errors: string[],
    current: number,
    total: number

}

type DownloadId = string;

type GenerateHandler = <Id>(id: Id) => Observable<{downloadId: DownloadId}>;

type CheckPackageHandler = (id, downloadId: DownloadId) => Observable<PackageStatus>;

type PackageDownloadHandler = (id, downloadId: DownloadId) => string;

export class PackageHandler {
    #done$ = new Subject<any>();
    downloadId: string;

    packageState = PackageProgress.STARTING;
    current = 0;
    total = 0;
    downloadUrl = '';
    errors = [];

    #START = 0.15;

    constructor(
        private id: string | number,
        generatePackage: GenerateHandler,
        checkPackageHandler: CheckPackageHandler,
        packageDownloadHandler: PackageDownloadHandler,
        private window: Window
    ) {
        generatePackage(
            this.id
        ).pipe(
            switchMap(({ downloadId }) => {
                this.packageState = PackageProgress.GENERATING;
                this.total = 100;
                this.current = 2;
                this.downloadId = downloadId;
                return interval(250);
            }),
            tap(_ => {
                if (this.current < (this.#START * this.total)) {
                    this.current += 0.25;
                }
            }),
            filter(iteration => iteration % 20 === 0 && iteration > 20),
            switchMap(_ => checkPackageHandler(this.id, this.downloadId)),
            takeUntil(this.#done$)
        ).subscribe((
            { state, total, current, errors }: PackageStatus
        ) => {
            switch (state) {
                case PackageState.READY:
                    this.packageState = PackageProgress.DOWNLOAD_READY;
                    this.current = this.total = this.total || 100;
                    this.downloadUrl = packageDownloadHandler(this.id, this.downloadId);
                    this.window.location.assign(this.downloadUrl);
                    this.#done$.next('done');
                    break;

                case PackageState.FAILED:
                    this.packageState = PackageProgress.PACKAGE_ERROR;
                    this.errors = errors;
                    this.#done$.next('done');
                    break;

                case PackageState.PENDING:
                    this.packageState = PackageProgress.GENERATING;
                    this.current = Math.max(current, this.#START * this.total);
                    this.total = total;
                    break;

                default:
                    this.packageState = PackageProgress.GENERATING;
                    this.current = this.#START * this.total;
                    this.total = 100;
            }
        });
    }
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-modal-download-async',
    templateUrl : 'download-async.component.html',
    styleUrls   : ['download-async.component.scss']
})
export class DownloadAsyncModalContent implements ModalContent {
    @Input() heading: string;
    @Input() modal: ModalType;
    @Input() manifest: ModalManifest;
    @Input() values: Record<string, any>;

    PACKAGE_PROGRESS = PackageProgress;
    packageHandler: PackageHandler;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private cloudApi: NxCloudApiService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.config;
    }

    ngOnInit() {
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

    close = (result?) => {
        this.activeModal.close(result);
    }
}
