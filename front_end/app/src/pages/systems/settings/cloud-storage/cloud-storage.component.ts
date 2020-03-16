import {
    Component,
    LOCALE_ID,
    Inject
}                                       from '@angular/core';
import { NxConfigService, IConfig }              from '../../../../services/nx-config';
import { NxLanguageProviderService }    from '../../../../services/nx-language-provider';
import { NxDialogsService }             from '../../../../dialogs/dialogs.service';
import { BehaviorSubject }                 from 'rxjs';
import { fromBits }                     from '../../../../utils/transform-tools/from-bits';
import { wrapWithPercent }              from '../../../../utils/transform-tools/wrap-with-percent';
import { NxUtilsService }               from '../../../../services/utils.service';
import { LanguageI18NStaticTypes }      from '../../../../../language_i18n_static_types';
import { NxSettingsService } from '../settings.service';
import { NxSystem, NxSystemUser } from '../../../../services/system.service';

@Component({
    selector : 'nx-cloud-storage',
    templateUrl : './cloud-storage.component.html',
    styleUrls : ['./cloud-storage.component.scss']
})
export class NxCloudStorageComponent {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    system$: BehaviorSubject<NxSystem>;

    usageStats: IUsageStats;
    _cloudCapacity: number;

    private setupDefaults({ configService, languageService }) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
    }

    constructor(configService: NxConfigService,
        languageService: NxLanguageProviderService,
        @Inject(LOCALE_ID) private locale: string,
        private dialogService: NxDialogsService,
        private utilsService: NxUtilsService,
        private settingsService: NxSettingsService
    ) {
        this.setupDefaults({ configService, languageService });
        this.init();
    }

    private init() {
        this.system$ = this.settingsService.systemSubject;
        this.system$.subscribe(system => {
            // Not sure if this observable will be needed
            this.usageStats = emptyUsage;
            this._cloudCapacity = 100000000000;
        });
    }
    // Property getters

    get user() {
        return this.system$.value.currentUser;
    }

    get userEmail() {
        return this.system$.value.currentUserEmail;
    }

    get canViewCloudStorage() {
        return this.system$.value.canViewCloudStorage();
    }

    get isOwner() {
        return this.system$.value.isOwner;
    }

    get systemId() {
        return this.system$.value.id;
    }

    get cloudStorageSystemEnabled() {
        return false;
    }
    // Helper Methods

    public get cloudCapacity() {
        const { locale } = this;
        return fromBits(this._cloudCapacity, { locale, roundTo: 1073741824 / 10 });
    }

    public get bitrate() {
        const { locale } = this;
        return (
            this.usageStats.recordingBitrate === '_'
                ? this.usageStats.recordingBitrate
                : fromBits(this.usageStats.recordingBitrate, { unitType: 'bps', locale })
        );
    }

    public msFriendlyTime(ms: number | '_', suffix = false) {
        return (
            ms === '_'
                ? ms
                : this.utilsService.msFromNowToString(ms, suffix));
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
        return this.pluralize(this.usageStats.archiveFrom, this.translate('Camera'), this.translate('Cameras'));
    }

    // TODO: pluralize and translate not implmented, need to figure out how we're going to handle

    public pluralize = this.utilsService.pluralize

    public translate = this.utilsService.translate

    // Processes should be in dialogService

    public enableCloudStorage() {
        // // replace
        // const { system$: {} } = this;
        // return this.processService.createProcess(() => this.cloudApiService.enableCloudStorage(systemId, email))
        //     .then(() => {
        //     // handle success here
        //     });
        // // this.cloudStorageService.enable('test', 'test');
    }

    public disableCloudStorage() {
        // const { systemId, accountService: { email } } = this;
        // return this.processService.createProcess(() => this.cloudApiService.disableCloudStorage(systemId, email))
        //     .then(() => {
        //     // handle success here
        //     });
        // // this.cloudStorageService.disable();
    }

    public moveCloudStorage(targetSystemId: string) {
        // const { systemId, accountService: { email } } = this;
        // return this.processService.createProcess(() => this.cloudApiService.moveCloudStorage(systemId, targetSystemId, email));
    }

    public toggleCloudState() {
        // this.cloudStorageService.toggleUsageState();
    }

    // TEMP

    public moveToDialog() {
        // const [system, systems, peerSystems, user] = this.cloudStorageService.getMoveParams();
        // this.dialogService.cloudStorageMove(system, systems, peerSystems, user);
        // this.dialogService.cloudStorageMove('string', 'string', 'string');
    }

    public deleteCloudStorageDialog() {
        // this.dialogService.cloudStorageDelete(this.systemId);
    }

    // Error Dialog Methods

    public activationErrorDialog() {
        // const { dialogs: { cloudStorage:{ activationError: { title, message } }, buttons: { ok } } } = this.LANG;
        // this.dialogService.confirm(message, title, ok);
    }

    public noOtherSystemsErrorDialog() {
        // const { dialogs: { cloudStorage:{ noOtherSystemsError: { message }, moveCloudStorage: { title } }, buttons: { ok } } } = this.LANG;
        // this.dialogService.confirm(message, title, ok);
    }

    public systemDisconnectErrorDialog() {
        // const { dialogs: { cloudStorage:{ systemDisconnectError: { title, message } }, buttons: { ok } } } = this.LANG;
        // this.dialogService.confirm(message, title, ok);
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

export const regularUsage: IUsageStats = {
    currentRecordings : 7457136000, // ms, rounded to the hour
    whenFullyUsed     : 1209600000, // ms, rounded to the hour
    amountUsed        : 17424682320, // bytes rounded to 0.1 Gb, percent calculated and rounded to 1%
    archiveFrom       : 11, // number of cameras represented by integer
    recordingBitrate  : 1500000, // bps rounded to 0.1 Mbps
    delayFromLive     : 1200000 // ms, rounded to 0.1s
};

export interface ICloudStorageState {
    cloudCapacity: number
    systemCloudEnabled: boolean
    userCloudEnabled: boolean
    usageStats: IUsageStats
  }

export interface IUsageStats {
      currentRecordings: UsageTypes
      whenFullyUsed: UsageTypes
      amountUsed: UsageTypes
      archiveFrom: UsageTypes
      recordingBitrate: UsageTypes
      delayFromLive: UsageTypes
  }

export const mockState: ICloudStorageState = {
    cloudCapacity      : 100000000000,
    systemCloudEnabled : true,
    userCloudEnabled   : true,
    usageStats         : regularUsage
};

  type UsageTypes = '_' | number
