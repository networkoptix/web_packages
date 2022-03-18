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
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import type { NxSystem } from '@services/system.service/system';
import { NxUtilsService } from '@services/utils.service/utils.service';
import { NxMenuService } from '@src/menu/menu.service';
import { bitsToString } from '@utils/bits-to-string';
import { wrapWithPercent } from '@utils/general';

import { NxSettingsService } from '../settings.service';

type UsageTypes = '&mdash;' | number;

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
        this.cloudStorageInitial = this.LANG.dialogs.cloudStorage.initial({
            compCapacity: this.compCloudCapacity
        });
        this.layoutSimple = (this.layout && this.layout === 'simple');
        this.initEnableCloudStorageProcess();
    }

    private msFromNowToString(ms: number): string {
        const diff = Date.now() - ms;

        let minutes = Math.floor(diff / 1000 / 60);
        let hours = Math.floor(minutes / 60);
        let days = Math.floor(hours / 24);
        let weeks = Math.floor(days / 7);
        let months = Math.floor(days / 30);
        let years = Math.floor(days / 365);

        minutes %= 60;
        hours %= 24;
        days %= 30;
        weeks %= 7;
        months %= 12;
        years %= 365;

        const {
            yearS,
            monthS,
            weekS,
            dayS,
            hourS,
            minuteS,
        } = this.LANG.common.intervals;
        if (years) {
            return yearS({ count: years });
        } else if (months) {
            return monthS({ count: months });
        } else if (weeks) {
            return weekS({ count: weeks });
        } else if (days) {
            return dayS({ count: days });
        } else if (hours) {
            return hourS({ count: hours });
        } else if (minutes) {
            return minuteS({ count: minutes });
        } else {
            return '&mdash;';
        }
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
        return bitsToString(
            this._cloudCapacity,
            { locale, roundTo: 1073741824 / 10 }
        );
    }

    public get compCloudCapacity() {
        const {
            locale,
            CONFIG: { cloudCapabilities: { cloudStorageSize } }
        } = this;
        return bitsToString(
            cloudStorageSize,
            { locale, roundTo: 1073741824 / 10 }
        );
    }

    public get bitrate() {
        const { locale } = this;
        return (
            typeof this.usageStats.recordingBitrate !== 'number'
                ? this.usageStats.recordingBitrate
                : bitsToString(
                    this.usageStats.recordingBitrate,
                    { unitType: 'bps', locale }
                )
        );
    }

    public get cloudStorageUsed() {
        const { locale } = this;
        return (
            typeof this.usageStats.amountUsed !== 'number'
                ? this.usageStats.amountUsed
                : wrapWithPercent(
                    this.usageStats.amountUsed,
                    this._cloudCapacity,
                    bitsToString(
                        this.usageStats.amountUsed,
                        { locale, roundTo: 1073741824 / 10 }
                    ),
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
                : this.msFromNowToString(ms));
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
    }

    private updateEnabledAndUsageStats() {
        if (!this.systemId || !this.system$.value.cloudStorageCapable) {
            this.cloudStorageSystemEnabled = true;
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
        ).then(result => {
            if (result !== 'noOtherSystemsError') {
                this.dialogService.confirm(
                    this.LANG.dialogs.cloudStorage.noOtherSystemsError.message?.(),
                    this.LANG.dialogs.cloudStorage.title?.(),
                    this.LANG.dialogs.buttons.ok?.()
                );
            }
        });
    }

    // Callback for disabled or moved storage

    private handleCloudStorageDisabled = () => {
        this.cloudStorageSystemEnabled = false;
    };
}
