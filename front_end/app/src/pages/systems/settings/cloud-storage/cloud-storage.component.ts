import { Component, LOCALE_ID, Inject, OnInit } from '@angular/core';
import { NxConfigService, IConfig }     from '../../../../services/nx-config';
import { NxLanguageProviderService }    from '../../../../services/nx-language-provider';
import { NxDialogsService }             from '../../../../dialogs/dialogs.service';
import { BehaviorSubject }              from 'rxjs';
import { fromBits }                     from '../../../../utils/transform-tools/from-bits';
import { wrapWithPercent }              from '../../../../utils/transform-tools/wrap-with-percent';
import { NxUtilsService }               from '../../../../services/utils.service';
import { LanguageI18NStaticTypes }      from '../../../../../language_i18n_static_types';
import { NxSettingsService }            from '../settings.service';
import { NxSystem }                     from '../../../../services/system.service';
import { NxCloudApiService }            from '../../../../services/nx-cloud-api';
import { NxProcessService, Process }             from '../../../../services/process.service';

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
    _cloudCapacity: number;
    cloudStorageSystemEnabled$ = new BehaviorSubject(false);
    systems$: BehaviorSubject<NxSystem[]>;
    enableCloudStorage: Process;
    updateEnabledUsageAndStats: Process;
    cloudEnabled = false;

    // Constructor and class initialization methods

    constructor(configService: NxConfigService,
        languageService: NxLanguageProviderService,
        @Inject(LOCALE_ID) private locale: string,
        private dialogService: NxDialogsService,
        private utilsService: NxUtilsService,
        private settingsService: NxSettingsService,
        private cloudApiService: NxCloudApiService,
        private processService: NxProcessService
    ) {
        this.setupDefaults({ configService, languageService });
        this.init();
        this.cloudEnabled = !!this.CONFIG.cloudCapabilities.cloudStorageEnabled;
    }

    private setupDefaults({ configService, languageService }) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
    }

    private init() {
        this.system$ = this.settingsService.systemSubject;
        this.system$.subscribe(system => {
            if (system === undefined) return;
            this.updateEnabledAndUsageStats();
        });
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

    public get cloudCapacity() {
        const { locale } = this;
        return fromBits(this._cloudCapacity, { locale, roundTo: 1073741824 / 10 });
    }

    public get compCloudCapacity() {
        const { locale } = this;
        // TODO: Where will the comp cloud capacity come from? Config?
        return fromBits(53687091200, { locale, roundTo: 1073741824 / 10 });
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

    set cloudStorageSystemEnabled(value: boolean) {
        this.cloudStorageSystemEnabled$.next(value);
    }

    get cloudStorageSystemEnabled() {
        return this.cloudStorageSystemEnabled$.value;
    }

    set systems(value) {
        this.systems$.next(value);
    }

    // Handler methods for actions

    private initEnableCloudStorageProcess() {
        this.enableCloudStorage = this.processService.createProcess(() => {
            const { dialogs: { cloudStorage:{ activationError: { title, message } }, buttons: { ok } } } = this.LANG;
            // TODO: check if more storage is available, need to find where to get this
            // eslint-disable-next-line no-constant-condition
            if (false) {
                return this.dialogService.confirm(message, title, ok);
            }
            return this.cloudApiService.enableCloudStorage(this.systemId);
        }, {
            successMessage : 'Cloud Storage Enabled',
            errorPrefix    : 'Error Enabling Cloud Storage'
        }).then(() => {
            this.cloudStorageSystemEnabled = true;
            this.updateEnabledAndUsageStats();
        }
        // TODO: Will implement erros on a future task when api service is finalized
        );
    };

    private updateEnabledAndUsageStats() {
        // TODO: maybe needs to be a process
        this.cloudApiService.getCloudStorageUsage(this.systemId)
            .then(({ enabled, cloudCapacity, ...usageStats }) => {
                this.usageStats = { ...emptyUsage, ...usageStats };
                this.cloudStorageSystemEnabled = enabled;
                this._cloudCapacity = cloudCapacity;
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
