import {
    Component,
    LOCALE_ID,
    Inject,
    OnInit,
    Input,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import {
    InfoBlockColumns,
    InfoBlockSection,
    InfoBlockLine,
} from '@components/info-block/info-block.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem } from '@services/system.service';
import { NxUtilsService } from '@services/utils.service';
import { NxMenuService } from '@src/menu';

import { NxSettingsService } from '../settings.service';

@Component({
    selector: 'nx-cloud-storage',
    templateUrl: './cloud-storage.component.html',
    styleUrls: ['./cloud-storage.component.scss']
})
export class NxCloudStorageComponent implements OnInit {
    @Input() layout;
    @Input() type: string;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    system$: BehaviorSubject<NxSystem>;

    usageStats: IUsageStats;
    _cloudCapacity: number = 0;
    cloudStorageSystemEnabled$: BehaviorSubject<boolean | string> = new BehaviorSubject('loading');
    systems$: BehaviorSubject<NxSystem[]>;
    enableCloudStorage: Process;
    updateEnabledUsageAndStats: Process;
    parsedUsage: InfoBlockColumns;

    layoutSimple: boolean;
    cloudStorageInitial: string;

    // Constructor and class initialization methods
    private setupDefaults() {
        this.usageStats = emptyUsage;
        this.system$ = this.settingsService.systemSubject;
        this.system$.subscribe(system => {
            if (system === undefined) return;
            this.updateEnabledAndUsageStats();
            if (system.cloudStorageCapable === undefined) {
                system.getInfoAndPermissions();
            }
        });
        this.menuService.section = this.type === 'servers'
            ? this.CONFIG.menus.systemSettings.servers.id
            : this.CONFIG.menus.systemSettings.admin.id;
        if (this.type !== 'servers') {
            this.menuService.detail =
                this.CONFIG.menus.systemSettings.cloudStorage.id;
        }
    }

    constructor(configService: NxConfigService,
        languageService: NxLanguageProviderService,
        @Inject(LOCALE_ID) private locale: string,
        private dialogService: NxDialogsService,
        private utilsService: NxUtilsService,
        private settingsService: NxSettingsService,
        private cloudApiService: NxCloudApiService,
        private processService: NxProcessService,
        private menuService: NxMenuService,
        private route: ActivatedRoute
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit() {
        this.setupDefaults();
        this.cloudStorageInitial = NxLanguageProviderService.translate(
            this.LANG.dialogs.cloudStorage.initial,
            { compCapacity: this.compCloudCapacity }
        );
        this.layoutSimple = (this.layout && this.layout === 'simple');
        this.initEnableCloudStorageProcess();
    }

    // Getters for view

    get user() {
        return this.system$.value.currentUser;
    }

    get userEmail() {
        return this.system$.value.currentUserEmail;
    }

    get isOwner() {
        return this.system$.value.isOwner;
    }

    get systemCloudStorageCapable() {
        return this.system$.value.cloudStorageCapable ||
            this.CONFIG.clientMode.beta ||
            this.route.snapshot.queryParams.beta !== undefined;
    }

    public get cloudCapacity() {
        const { locale } = this;
        return NxUtilsService.fromBits(this._cloudCapacity, {
            locale,
            roundTo: 1073741824 / 10
        });
    }

    public get compCloudCapacity() {
        const {
            locale,
            CONFIG: { cloudCapabilities: { cloudStorageSize } }
        } = this;
        return NxUtilsService.fromBits(cloudStorageSize, {
            locale,
            roundTo: 1073741824 / 10
        });
    }

    public get bitrate() {
        const { locale } = this;
        return (
            typeof this.usageStats.recordingBitrate !== 'number'
                ? this.usageStats.recordingBitrate
                : NxUtilsService.fromBits(this.usageStats.recordingBitrate, {
                    unitType: 'bps',
                    locale
                })
        );
    }

    public get cloudStorageUsed() {
        const { locale } = this;
        return (
            typeof this.usageStats.amountUsed !== 'number'
                ? this.usageStats.amountUsed
                : NxUtilsService.wrapWithPercent(
                    this.usageStats.amountUsed,
                    this._cloudCapacity,
                    NxUtilsService.fromBits(
                        this.usageStats.amountUsed,
                        { locale, roundTo: 1073741824 / 10 }),
                    2
                )
        );
    }

    public get numberOfCameras() {
        if (typeof this.usageStats.archiveFrom !== 'number') {
            return this.usageStats.archiveFrom;
        }

        const single = this.usageStats.archiveFrom === 1;
        const { camera, cameras } = this.LANG.dialogs.cloudStorage;
        return `${this.usageStats.archiveFrom} ${single ? camera?.() : cameras?.()}`;
    }

    // String methods for view

    public msFriendlyTime(ms: number | '&mdash;', suffix = false) {
        return (
            ms === '&mdash;'
                ? ms
                : this.utilsService.msFromNowToString(ms, suffix));
    }

    // Other getters
    get systemId() {
        return this.system$.value.id;
    }

    set cloudStorageSystemEnabled(value: boolean | string) {
        const section1 = new InfoBlockSection([
            new InfoBlockLine(
                this.LANG.dialogs.cloudStorage.usageLabels.currentRecordings(),
                this.msFriendlyTime(this.usageStats.currentRecordings)
            ),
            new InfoBlockLine(
                this.LANG.dialogs.cloudStorage.usageLabels.whenFullyUsed(),
                this.msFriendlyTime(this.usageStats.whenFullyUsed)
            ),
            new InfoBlockLine(
                this.LANG.dialogs.cloudStorage.usageLabels.amountUsed(),
                this.cloudStorageUsed
            )
        ]);
        const section2 = new InfoBlockSection([
            new InfoBlockLine(
                this.LANG.dialogs.cloudStorage.usageLabels.archiveFrom(),
                this.numberOfCameras
            ),
            new InfoBlockLine(
                this.LANG.dialogs.cloudStorage.usageLabels.recordingBitrate(),
                this.bitrate
            ),
            new InfoBlockLine(
                this.LANG.dialogs.cloudStorage.usageLabels.delayFromLive(),
                this.msFriendlyTime(this.usageStats.delayFromLive, true)
            )
        ]);
        this.parsedUsage = [[section1], [section2]];
        this.cloudStorageSystemEnabled$.next(value);
    }

    get cloudStorageSystemEnabled(): boolean | string {
        return this.cloudStorageSystemEnabled$.value;
    }

    get cloudStorageStateLoading() {
        return this.cloudStorageSystemEnabled$.value === 'loading';
    }

    set systems(value) {
        this.systems$.next(value);
    }

    // Handler methods for actions

    private initEnableCloudStorageProcess() {
        this.enableCloudStorage = this.processService.createProcess(() => {
            // Uncomment these lines and add condition in if statement if we add account limits.
            // const { dialogs: { cloudStorage:{ activationError: { title, message } }, buttons: { ok } } } = this.LANG;
            // if (false) {
            //     return this.dialogService.confirm(message, title, ok);
            // }
            return this.cloudApiService.enableCloudStorage(this.systemId);
        }, {
            errorCodes: {
                cloudInvalidResponse: () => {
                    return this.LANG.errorCodes.notAuthorized?.();
                },
                networkConnection: () => {
                    return this.LANG.errorCodes.networkConnection();
                }
            },
            successMessage: this.LANG.dialogs.cloudStorage.enableCloudStorage.success?.(),
            errorPrefix: this.LANG.dialogs.cloudStorage.enableCloudStorage.errorPrefix?.()
        }).then(() => {
            this.cloudStorageSystemEnabled = true;
            this.updateEnabledAndUsageStats();
        }
        // TODO: Will implement errors on a future task when api service is finalized
        );
    };

    private updateEnabledAndUsageStats() {
        if (!this.systemId || !this.system$.value.cloudStorageCapable) {
            this.cloudStorageSystemEnabled = false;
            return;
        }
        this.cloudApiService.getCloudStorageUsage(this.systemId)
            .then(({ resultCode = false, cloudCapacity, ...usageStats }) => {
                usageStats.spaceUsed = parseInt(usageStats.spaceUsed);
                this.usageStats = { ...emptyUsage, ...usageStats };
                this.cloudStorageSystemEnabled = !resultCode;
                this._cloudCapacity = parseInt(cloudCapacity);
            }, () => {
                this.cloudStorageSystemEnabled = false;
            });
    }

    public deleteCloudStorage() {
        this.dialogService.cloudStorageDelete(
            this.system$,
            this.handleCloudStorageDisabled
        );
    }

    public moveCloudStorage() {
        // TODO: Need list of systems
        this.dialogService.cloudStorageMove(
            this.system$,
            this.handleCloudStorageDisabled
        );
    }

    // Callback for disabled or moved storage

    private handleCloudStorageDisabled = () => {
        this.cloudStorageSystemEnabled = false;
    }
}

export const emptyUsage: IUsageStats = {
    currentRecordings: '&mdash;',
    whenFullyUsed: '&mdash;',
    amountUsed: '&mdash;',
    archiveFrom: '&mdash;',
    recordingBitrate: '&mdash;',
    delayFromLive: '&mdash;'
};

export interface IUsageStats {
    currentRecordings: UsageTypes
    whenFullyUsed: UsageTypes
    amountUsed: UsageTypes
    archiveFrom: UsageTypes
    recordingBitrate: UsageTypes
    delayFromLive: UsageTypes
}

type UsageTypes = '&mdash;' | number
