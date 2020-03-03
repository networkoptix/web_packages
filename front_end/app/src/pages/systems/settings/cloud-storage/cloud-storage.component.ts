import { Component, OnInit } from '@angular/core';
import { NxConfigService } from '../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxDialogsService } from '../../../../dialogs/dialogs.service';

@Component({
    selector   : 'nx-cloud-storage',
    templateUrl: './cloud-storage.component.html',
    styleUrls  : ['./cloud-storage.component.scss']
})
export class NxCloudStorageComponent implements OnInit {
    CONFIG: any = {};
    LANG: any = {};

    private setupDefaults({ configService, languageService }) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
    }

    constructor(configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private dialogService: NxDialogsService
    ) {
        this.setupDefaults({ configService, languageService });
    }

    ngOnInit(): void {
    }

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
