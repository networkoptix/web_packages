import {
    Component, Input, OnInit, TemplateRef, ViewContainerRef,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { startCase } from 'lodash';
import { BehaviorSubject, combineLatest, filter, map, shareReplay, switchMap, take } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { POS_STRATEGY } from '@components/popover/popover-config';
import { NxPopoverService } from '@components/popover/popover.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LicenseManager } from '@services/system.service/license-manager/licence-manager';
import { CLOUD_STORAGE_STATES, LicenseKeyFields, ProcessedLicenseKey } from '@services/system.service/license-manager/license-manager.types';
import { NxMenuService } from '@src/menu/menu.service';

import { NxSettingsService } from '../settings.service';

// const mockLicenses = [
//     { size: '100gb', state: 'Active', system: 'Some System', expires: '20 Apr 2023', key: 'abcd1234efgh5678' },
//     { size: '42gb', state: 'Active', system: 'The Answer', expires: '20 Apr 2023', key: 'abcd1234efg69420' },
//     { size: 'urMom', state: 'Inactive', system: 'Huge', expires: '20 Apr 2023', key: 'abcd1234efg69420' }
// ];

@UntilDestroy()
@Component({
    selector: 'nx-cloud-storage',
    templateUrl: './cloud-storage.component.html',
    styleUrls: ['./cloud-storage.component.scss']
})
export class NxCloudStorageComponent implements OnInit {
    @Input() type: string;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    TRANSLATION_KEY = LicenseManager.TRANSLATION_KEY;

    readonly MASK = 'AAAA-AAAA-AAAA-AAAA';

    CLOUD_STORAGE_STATES = CLOUD_STORAGE_STATES;
    showKeys$ = new BehaviorSubject(false);
    fields: LicenseKeyFields[] = ['size', 'state', 'system', 'expires', 'key'];
    asc = true;
    sortBy = '';
    serverSettings = '';
    licenseManager: LicenseManager;

    #sort$ = new BehaviorSubject<LicenseKeyFields>(null);
    systemLicenses$ = new BehaviorSubject<ProcessedLicenseKey[]>(null);
    userLicenses$ = new BehaviorSubject<ProcessedLicenseKey[]>(null);

    // Mock state
    cloudStorageNotUsed = true;

    // Mock Usage Info
    usageMessage = '28 GB of 50 GB (56%) is used';
    usages = [
        { size: 5, color: 'blue', title: 'Blue usage description' },
        { size: 12, color: 'green', title: 'Green usage description' },
        { size: 18, color: 'yellow', title: 'Yellow usage description' },
        { size: 29, color: 'orange', title: 'Orange usage description' }
    ];

    sort(column: LicenseKeyFields): void {
        if (this.sortBy === column) {
            this.asc = !this.asc;
        } else {
            this.sortBy = column;
            this.asc = true;
        }

        this.#sort$.next(column);
    }

    perform = (actionId: string) => this.dialogService[`cloudStorage${startCase(actionId)}`](this.licenseManager);

    showPopover = <T>(template: TemplateRef<T>, target: HTMLElement): void => {
        this.popoverService.open(
            template,
            target,
            {
                panelClass: 'rounded-popover',
                arrowOffset: 4,
                positionStrategy: POS_STRATEGY.BOTTOM
            },
            this.viewContainerRef
        );
    };

    closePopover = () => this.popoverService.close();

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        settingsService: NxSettingsService,
        private cloudApi: NxCloudApiService,
        private viewContainerRef: ViewContainerRef,
        private popoverService: NxPopoverService,
        public dialogService: NxDialogsService,
        private menuService: NxMenuService,
    ) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
        if (environment.isLocal) {
            this.serverSettings = '/settings/servers';
        } else {
            settingsService.systemSubject.pipe(
                filter(system => !!system?.id),
                take(1)).toPromise().then(system => {
                this.serverSettings = `/systems/${system.id}/servers`;
            });
        }
        settingsService.systemSubject.pipe(
            filter(system => !!system),
            switchMap(system => system.getLicenseManager()),
            untilDestroyed(this)
        ).subscribe(this.initLicenseManager);
    }

    initLicenseManager = (licenseManager: LicenseManager) => {
        this.licenseManager = licenseManager;
        combineLatest([this.#sort$, this.licenseManager.userKeys$, this.showKeys$]).pipe(
            map(([sortBy, licenses]) => !sortBy ? licenses : licenses.sort((a, b) => {
                const dir = this.asc ? 1 : -1;
                const aVal = a[sortBy];
                const bVal = b[sortBy];

                if (aVal === bVal) {
                    return 0;
                }

                return aVal < bVal ? dir : -dir;
            })),
            shareReplay({ bufferSize: 1, refCount: true }),
            untilDestroyed(this)
        ).subscribe(this.userLicenses$);
        this.licenseManager.systemKeys$.pipe(untilDestroyed(this)).subscribe(this.systemLicenses$);
    };

    ngOnInit(): void {
        if (this.type !== 'servers') {
            this.cloudApi.checkFeatureNotice('cloudStorage', () => this.dialogService.cloudStorageInfo({ licenseManager: this.licenseManager })).toPromise();
            this.menuService.section = this.CONFIG.menus.systemSettings.admin.id;
            this.menuService.detail = this.CONFIG.menus.systemSettings.cloudStorage.id;
        }
    }
}
