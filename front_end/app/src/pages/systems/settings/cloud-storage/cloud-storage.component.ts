import {
    Component,
    OnInit,
    LOCALE_ID,
    Inject
}                                       from '@angular/core';
import { NxConfigService, IConfig }              from '../../../../services/nx-config';
import { NxLanguageProviderService }    from '../../../../services/nx-language-provider';
import { NxDialogsService }             from '../../../../dialogs/dialogs.service';
import { Subscription, Subscribable, BehaviorSubject }                 from 'rxjs';
import { ActivatedRoute }               from '@angular/router';
import {
    NxCloudStorageService,
    ICloudStorageState
}                                       from './cloud-storage.service';
import { fromBits }                     from '../../../../utils/transform-tools/from-bits';
import { wrapWithPercent }              from '../../../../utils/transform-tools/wrap-with-percent';
import { NxUtilsService }               from '../../../../services/utils.service';
import { LanguageI18NStaticTypes }      from '../../../../../language_i18n_static_types';
import { NxProcessService }             from '../../../../services/process.service';
import { NxCloudApiService }            from '../../../../services/nx-cloud-api';
import { NxAccountService }             from '../../../../services/account.service';

@Component({
    selector : 'nx-cloud-storage',
    templateUrl : './cloud-storage.component.html',
    styleUrls : ['./cloud-storage.component.scss']
})
export class NxCloudStorageComponent implements OnInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    routerParamsSubscription: Subscription;
    systemId: string;
    currentState: ICloudStorageState;
    usageStats = this.currentState.usageStats;

    private setupDefaults({ configService, languageService }) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
    }

    constructor(configService: NxConfigService,
        languageService: NxLanguageProviderService,
        @Inject(LOCALE_ID) private locale: string,
        private dialogService: NxDialogsService,
        private route: ActivatedRoute,
        private cloudStorageService: NxCloudStorageService,
        private utilsService: NxUtilsService,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private accountService: NxAccountService
    ) {
        this.setupDefaults({ configService, languageService });
        this.cloudStorageService.currentState$.subscribe(nextState => {
            this.currentState = nextState;
        });
    }

    ngOnInit(): void {
        // ????
        // this.routerParamsSubscription = this.route.params.subscribe(params => {
        //     if (params.systemId) {
        //         this.systemId = params.systemId;
        //     }
        // });
    }

    // Helper Methods

    public cloudCapacity() {
        const { locale } = this;
        return fromBits(this.currentState.cloudCapacity, { locale, roundTo: 1073741824 / 10 });
    }

    public bitrate() {
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

    public cloudStorageUsed() {
        const { locale } = this;
        return (
            this.usageStats.amountUsed === '_'
                ? this.usageStats.amountUsed
                : wrapWithPercent(
                    this.usageStats.amountUsed,
                    this.currentState.cloudCapacity,
                    fromBits(
                        this.usageStats.amountUsed,
                        { locale, roundTo: 1073741824 / 10 }),
                    2
                )
        );
    }

    public numberOfCameras() {
        if (this.usageStats.archiveFrom === '_') return this.usageStats.archiveFrom;
        return this.pluralize(this.usageStats.archiveFrom, this.translate('Camera'), this.translate('Cameras'));
    }

    // TODO: pluralize and translate not implmented, need to figure out how we're going to handle

    public pluralize = this.utilsService.pluralize

    public translate = this.utilsService.translate

    // Processes should be in dialogService

    public enableCloudStorage() {
        const { systemId, accountService: { email } } = this;
        return this.processService.createProcess(() => this.cloudApiService.enableCloudStorage(systemId, email))
            .then(() => {
            // handle success here
            });
        // this.cloudStorageService.enable('test', 'test');
    }

    public disableCloudStorage() {
        const { systemId, accountService: { email } } = this;
        return this.processService.createProcess(() => this.cloudApiService.disableCloudStorage(systemId, email))
            .then(() => {
            // handle success here
            });
        // this.cloudStorageService.disable();
    }

    public moveCloudStorage(targetSystemId: string) {
        const { systemId, accountService: { email } } = this;
        return this.processService.createProcess(() => this.cloudApiService.moveCloudStorage(systemId, targetSystemId, email));
    }

    public toggleCloudState() {
        // this.cloudStorageService.toggleUsageState();
    }

    // TEMP

    public moveToDialog() {
        // const [system, systems, peerSystems, user] = this.cloudStorageService.getMoveParams();
        // this.dialogService.cloudStorageMove(system, systems, peerSystems, user);
        this.dialogService.cloudStorageMove('string', 'string', 'string');
    }

    public deleteCloudStorageDialog() {
        this.dialogService.cloudStorageDelete(this.systemId);
    }

    // Error Dialog Methods

    public activationErrorDialog() {
        const { dialogs: { cloudStorage:{ activationError: { title, message } }, buttons: { ok } } } = this.LANG;
        this.dialogService.confirm(message, title, ok);
    }

    public noOtherSystemsErrorDialog() {
        const { dialogs: { cloudStorage:{ noOtherSystemsError: { message }, moveCloudStorage: { title } }, buttons: { ok } } } = this.LANG;
        this.dialogService.confirm(message, title, ok);
    }

    public systemDisconnectErrorDialog() {
        const { dialogs: { cloudStorage:{ systemDisconnectError: { title, message } }, buttons: { ok } } } = this.LANG;
        this.dialogService.confirm(message, title, ok);
    }
}
