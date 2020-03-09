import { Component, OnInit, LOCALE_ID, Inject } from '@angular/core';
import { NxConfigService } from '../../../../services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxDialogsService } from '../../../../dialogs/dialogs.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { NxCloudStorageService, IMockState, IUsageStats } from './cloud-storage.service';
import { fromBits, IFromBytesOptions } from '../../../../utils/transform-tools/from-bits';
import { wrapWithPercent } from '../../../../utils/transform-tools/wrap-with-percent';
import { NxUtilsService } from '../../../../services/utils.service';

@Component({
    selector   : 'nx-cloud-storage',
    templateUrl: './cloud-storage.component.html',
    styleUrls  : ['./cloud-storage.component.scss']
})
export class NxCloudStorageComponent implements OnInit {
    CONFIG: any = {};
    LANG: any = {};
    routerParamsSubscription: Subscription;
    cloudStateSubscription: Subscription;
    systemId: string;
    currentState: IMockState;
    stats: IUsageStats;

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
        private utilsService: NxUtilsService
    ) {
        this.setupDefaults({ configService, languageService });
    }

    ngOnInit(): void {
        this.routerParamsSubscription = this.route.params.subscribe(params => {
            if (params.systemId) {
                this.systemId = params.systemId;
            }
        });
        this.cloudStateSubscription = this.cloudStorageService.currentState.subscribe(currentState => {
            this.currentState = currentState;
            this.stats = this.currentState.usageStats;
        });
    }
    // Helper Methods

    public cloudCapacity() {
        const { locale } = this;
        return fromBits(this.currentState.cloudCapacity, { locale, roundTo: 1073741824 / 10 });
    }

    public bitrate() {
        const { locale } = this;
        return (
            this.stats.recordingBitrate === '_'
                ? this.stats.recordingBitrate
                : fromBits(this.stats.recordingBitrate, { unitType: 'bps', locale })
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
            this.stats.amountUsed === '_'
                ? this.stats.amountUsed
                : wrapWithPercent(
                    this.stats.amountUsed,
                    this.currentState.cloudCapacity,
                    fromBits(
                        this.stats.amountUsed,
                        { locale, roundTo: 1073741824 / 10 }),
                    2
                )
        );
    }

    public numberOfCameras() {
        if (this.stats.archiveFrom === '_') return this.stats.archiveFrom;
        return this.pluralize(this.stats.archiveFrom, this.translate('Camera'), this.translate('Cameras'));
    }

    public pluralize = this.utilsService.pluralize

    public translate = this.utilsService.translate

    // Update State Methods

    public enableCloudStorage() {
        this.cloudStorageService.enable();
    }

    public disableCloudStorage() {
        this.cloudStorageService.disable();
    }

    public toggleCloudState() {
        this.cloudStorageService.toggleUsageState();
    }

    // Dialog Methods

    public moveToDialog() {
        const [system, systems, peerSystems, user] = this.cloudStorageService.getMoveParams();
        this.dialogService.cloudStorageMove(system, systems, peerSystems, user);
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
