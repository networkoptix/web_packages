import { Component, OnInit, LOCALE_ID, Inject } from '@angular/core';
import { NxConfigService } from '../../../../services/nx-config';
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

    public fromBytes = (val: number | '_', options?: IFromBytesOptions) => (
        val === '_'
            ? val
            : fromBits(val, { locale: this.locale, ...options })
    )

    public cloudCapacity() {
        return fromBits(this.currentState.cloudCapacity);
    }

    public bitrate() {
        return (
            this.stats.recordingBitrate === '_'
                ? this.stats.recordingBitrate
                : fromBits(this.stats.recordingBitrate, { unitType: 'bps' })
        );
    }

    public msFriendlyTime(ms: number | '_') {
        return (
            ms === '_'
                ? ms
                : this.utilsService.msToString(ms));
    }

    public cloudStorageUsed() {
        return (
            this.stats.amountUsed === '_'
                ? this.stats.amountUsed
                : wrapWithPercent(
                    this.stats.amountUsed, this.currentState.cloudCapacity, fromBits(this.stats.amountUsed), 2
                )
        );
    }

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
