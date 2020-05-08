import { Component, LOCALE_ID, Inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    NxConfigService, IConfig,
    NxLanguageProviderService,
    NxUtilsService, NxSystem,
    NxCloudApiService,
    NxProcessService, Process
}                                  from '../../../../services';
import { NxDialogsService }        from '../../../../dialogs';
import { NxSettingsService }       from '../settings.service';
import { NxMenuService }           from '../../../../menu';
import { LanguageI18NStaticTypes } from '../../../../../language_i18n_static_types';
import { fromBits }                from '../../../../utils/transform-tools/from-bits';
import { wrapWithPercent }         from '../../../../utils/transform-tools/wrap-with-percent';
import { BehaviorSubject }         from 'rxjs';

@Component({
    selector    : 'nx-cloud-storage',
    templateUrl : './cloud-storage.component.html',
    styleUrls   : ['./cloud-storage.component.scss']
})
export class NxCloudStorageComponent implements OnInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    system$: BehaviorSubject<NxSystem>;

    usageStats: IUsageStats;
    _cloudCapacity: number = 0;
    cloudStorageSystemEnabled$: BehaviorSubject<boolean | string> = new BehaviorSubject('loading');
    systems$: BehaviorSubject<NxSystem[]>;
    enableCloudStorage: Process;
    updateEnabledUsageAndStats: Process;

    // Constructor and class initialization methods

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
        this.setupDefaults({ configService, languageService });
        this.init();
    }

    private setupDefaults({ configService, languageService }) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
    }

    private init() {
        this.usageStats = emptyUsage;
        this.system$ = this.settingsService.systemSubject;
        this.system$.subscribe(system => {
            if (system === undefined) return;
            this.updateEnabledAndUsageStats();
            if (system.cloudStorageCapable === undefined) {
                system.getInfoAndPermissions();
            }
        });
        this.menuService.setSection(this.CONFIG.menus.systemSettings.admin.id);
        this.menuService.setDetailsSection(this.CONFIG.menus.systemSettings.cloudStorage.id);
    }

    ngOnInit() {
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
        return this.system$.value.cloudStorageCapable || this.CONFIG.clientMode.beta || this.route.snapshot.queryParams.beta !== undefined;
    }

    public get cloudCapacity() {
        const { locale } = this;
        return fromBits(this._cloudCapacity, { locale, roundTo: 1073741824 / 10 });
    }

    public get compCloudCapacity() {
        const { locale, CONFIG: { cloudCapabilities: { cloudStorageSize } } } = this;
        return fromBits(cloudStorageSize, { locale, roundTo: 1073741824 / 10 });
    }

    public get bitrate() {
        const { locale } = this;
        return (
            this.usageStats.recordingBitrate === '_'
                ? this.usageStats.recordingBitrate
                : fromBits(this.usageStats.recordingBitrate, { unitType: 'bps', locale })
        );
    }

    public get cloudStorageUsed() {
        const { locale } = this;
        return (
            this.usageStats.amountUsed === '_'
                ? this.usageStats.amountUsed
                : wrapWithPercent(
                    this.usageStats.amountUsed,
                    this._cloudCapacity,
                    fromBits(
                        this.usageStats.amountUsed,
                        { locale, roundTo: 1073741824 / 10 }),
                    2
                )
        );
    }

    public get numberOfCameras() {
        if (this.usageStats.archiveFrom === '_') return this.usageStats.archiveFrom;
        const single = this.usageStats.archiveFrom === 1;
        const { camera, cameras } = this.LANG.dialogs.cloudStorage;
        return `${this.usageStats.archiveFrom} ${single ? camera : cameras}`;
    }

    // String methods for view

    public msFriendlyTime(ms: number | '_', suffix = false) {
        return (
            ms === '_'
                ? ms
                : this.utilsService.msFromNowToString(ms, suffix));
    }

    // Other getters
    get systemId() {
        return this.system$.value.id;
    }

    set cloudStorageSystemEnabled(value: boolean | string) {
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
                    return this.LANG.errorCodes.notAuthorized;
                },
                networkConnection: () => {
                    return this.LANG.errorCodes.networkConnection.replace('{{cloudName}}', this.CONFIG.cloudName);
                }
            },
            successMessage : this.LANG.dialogs.cloudStorage.enableCloudStorage.success,
            errorPrefix    : this.LANG.dialogs.cloudStorage.enableCloudStorage.errorPrefix
        }).then(() => {
            this.cloudStorageSystemEnabled = true;
            this.updateEnabledAndUsageStats();
        }
        // TODO: Will implement erros on a future task when api service is finalized
        );
    };

    private updateEnabledAndUsageStats() {
        if (!this.systemId) return;
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
        this.dialogService.cloudStorageDelete(this.system$, this.handleCloudStorageDisabled);
    }

    public moveCloudStorage() {
        // TODO: Need list of systems
        this.dialogService.cloudStorageMove(this.system$, this.handleCloudStorageDisabled);
    }

    // Callback for disabled or moved storage

    private handleCloudStorageDisabled = () => {
        this.cloudStorageSystemEnabled = false;
    }
}

export const emptyUsage: IUsageStats = {
    currentRecordings : '_',
    whenFullyUsed     : '_',
    amountUsed        : '_',
    archiveFrom       : '_',
    recordingBitrate  : '_',
    delayFromLive     : '_'
};

export interface IUsageStats {
    currentRecordings: UsageTypes
    whenFullyUsed: UsageTypes
    amountUsed: UsageTypes
    archiveFrom: UsageTypes
    recordingBitrate: UsageTypes
    delayFromLive: UsageTypes
}

type UsageTypes = '_' | number
