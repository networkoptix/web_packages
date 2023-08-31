import { Component, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { startCase, isEqual } from 'lodash-es';
import {
    BehaviorSubject,
    combineLatest,
    distinctUntilChanged,
    map,
    shareReplay,
    switchMap,
} from 'rxjs';

import { POS_STRATEGY } from '@components/popover/popover-config';
import { NxPopoverService } from '@components/popover/popover.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import {
    CloudStorageManager,
    CloudStorageUpdate,
} from '@services/system.service/cloud-storage-manager/cloud-storage-manager';
import { LicenseManager } from '@services/system.service/license-manager/licence-manager';
import {
    CLOUD_STORAGE_STATES,
    KeyTableFieldsKey,
    ProcessedLicenseKey,
} from '@services/system.service/license-manager/license-manager.types';
import { NxSystem } from '@services/system.service/system';
import { icons, menus } from '@static-variables';

@UntilDestroy()
@Component({
    selector: 'nx-cloud-storage',
    templateUrl: './cloud-storage.component.html',
    styleUrls: ['./cloud-storage.component.scss'],
})
export class NxCloudStorageComponent implements OnInit {
    @Input() system: NxSystem;
    @Input() type: string;

    LANG = staticLang;

    TRANSLATION_BASE = LicenseManager.TRANSLATION_BASE;

    readonly MASK = 'AAAA-AAAA-AAAA-AAAA';

    CLOUD_STORAGE_STATES = CLOUD_STORAGE_STATES;
    showKeys$ = new BehaviorSubject(false);
    fields: KeyTableFieldsKey[] = ['size', 'state', 'system', 'expires', 'key'];
    asc = true;
    sortBy = '';
    serverSettings = '';
    licenseManager: LicenseManager;
    cloudStorageManager: CloudStorageManager;

    #sort$ = new BehaviorSubject<KeyTableFieldsKey>(null);
    systemLicenses$ = new BehaviorSubject<ProcessedLicenseKey[]>(null);
    userLicenses$ = new BehaviorSubject<ProcessedLicenseKey[]>(null);
    icons = icons;

    // Need to figure out how how we'll get this info and also when server storage settings will be updated
    cloudStorageNotUsed = false;

    #totalSize$ = this.systemLicenses$.pipe(map(([license]) => (license ? license.sizeBytes : 0)));

    usageMessage$ = this.#totalSize$.pipe(
        switchMap(sizeBytes => this.cloudStorageManager.getUsageMessage(sizeBytes)),
    );

    usages$ = this.#totalSize$.pipe(
        switchMap(sizeBytes => this.cloudStorageManager.getUsages(sizeBytes)),
    );

    sort(column: KeyTableFieldsKey): void {
        if (this.sortBy === column) {
            this.asc = !this.asc;
        } else {
            this.sortBy = column;
            this.asc = true;
        }

        this.#sort$.next(column);
    }

    perform = (actionId: string) =>
        this.dialogService[`cloudStorage${startCase(actionId)}`](
            this.licenseManager,
            this.cloudStorageManager,
        );

    showPopover = <T>(template: TemplateRef<T>, target: HTMLElement): void => {
        this.usages$.subscribe(
            usages =>
                usages.length &&
                this.popoverService.open(
                    template,
                    target,
                    {
                        panelClass: 'rounded-popover',
                        arrowOffset: 4,
                        positionStrategy: POS_STRATEGY.BOTTOM,
                    },
                    this.viewContainerRef,
                ),
        );
    };

    closePopover = () => this.popoverService.close();

    constructor(
        private cloudApi: NxCloudApiService,
        private viewContainerRef: ViewContainerRef,
        private popoverService: NxPopoverService,
        public dialogService: NxDialogsService,
        private menuService: NxMenuService,
    ) {}

    initCloudStorageManager = (system: NxSystem) => {
        this.cloudStorageManager = system.getCloudStorageManager(this.cloudApi.cloudStorageApi);
    };

    initLicenseManager = (licenseManager: LicenseManager) => {
        this.licenseManager = licenseManager;
        combineLatest([this.#sort$, this.licenseManager.userKeys$, this.showKeys$])
            .pipe(
                map(([sortBy, licenses]) =>
                    !sortBy
                        ? licenses
                        : licenses.sort((a, b) => {
                              const dir = this.asc ? 1 : -1;
                              const aVal = a[sortBy];
                              const bVal = b[sortBy];

                              if (aVal === bVal) {
                                  return 0;
                              }

                              return aVal < bVal ? dir : -dir;
                          }),
                ),
                shareReplay({ bufferSize: 1, refCount: true }),
                untilDestroyed(this),
            )
            .subscribe(this.userLicenses$);
        this.licenseManager.systemKeys$.pipe(untilDestroyed(this)).subscribe(this.systemLicenses$);

        this.systemLicenses$
            .pipe(distinctUntilChanged(isEqual), untilDestroyed(this))
            .subscribe(() => this.cloudStorageManager.updateState(CloudStorageUpdate.SYSTEM));
    };

    ngOnInit(): void {
        if (environment.isLocal) {
            this.serverSettings = '/settings/servers';
        } else {
            this.serverSettings = `/systems/${this.system.id}/servers`;
        }

        if (this.system) {
            this.initCloudStorageManager(this.system);
            this.system
                .getLicenseManager()
                .pipe(takeUntilDestroyed())
                .subscribe(manager => {
                    this.initLicenseManager(manager);
                });
        }
        if (this.type !== 'servers') {
            this.cloudApi
                .checkFeatureNotice('cloudStorage', () =>
                    this.dialogService.cloudStorageInfo(this.licenseManager),
                )
                .toPromise();
            this.menuService.selectedSection.set(menus.systemSettings.admin.id);
            this.menuService.selectedDetailsSection.set(menus.systemSettings.cloudStorage.id);
        }
    }

    ngOnDestroy(): void {
        // this.cloudStorageManager.destroy();
        // this.licenseManager?.destroy();
    }
}
