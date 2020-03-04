import { Component, OnInit } from '@angular/core';
import { NxConfigService } from '../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxDialogsService } from '../../../../dialogs/dialogs.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { NxCloudStorageService, IMockState } from './cloud-storage.service';

@Component({
    selector   : 'nx-cloud-storage',
    templateUrl: './cloud-storage.component.html',
    styleUrls  : ['./cloud-storage.component.scss']
})
export class NxCloudStorageComponent implements OnInit {
    CONFIG: any = {};
    LANG: any = {};
    routerParamsSubscription: Subscription;
    systemId: string;
    currentState: IMockState;

    private setupDefaults({ configService, languageService }) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
    }

    constructor(configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private dialogService: NxDialogsService,
        private route: ActivatedRoute,
        private cloudStorageService: NxCloudStorageService
    ) {
        this.setupDefaults({ configService, languageService });
    }

    ngOnInit(): void {
        this.routerParamsSubscription = this.route.params.subscribe(params => {
            if (params.systemId) {
                this.systemId = params.systemId;
            }
        });
        this.cloudStorageService.currentState.subscribe(currentState => { this.currentState = currentState; });
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
        this.dialogService.confirm('move dialog message', 'move dialog title', 'WIP');
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
