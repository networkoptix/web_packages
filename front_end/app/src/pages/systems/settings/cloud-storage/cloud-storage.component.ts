import { Component, OnInit } from '@angular/core';
import { NxConfigService } from '../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';

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
        languageService: NxLanguageProviderService
    ) {
        this.setupDefaults({ configService, languageService });
    }

    ngOnInit(): void {
    }
}
