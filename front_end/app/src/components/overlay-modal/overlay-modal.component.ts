import {
    Component, OnInit, OnDestroy
}                                   from '@angular/core';
import { Subscription }             from 'rxjs';
import { NxConfigService, IConfig } from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@Component({
    selector    : 'nx-overlay-modal',
    templateUrl : 'overlay-modal.component.html',
    styleUrls   : ['overlay-modal.component.scss']
})
export class NxOverlayModalComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    servers: { name: string, ip: string }[] = [
        {
            name : 'WIN_ULT',
            ip   : '172.16.0.151'
        },
        {
            name : 'WIN_ULT',
            ip   : '172.16.0.151'
        },
        {
            name : 'WIN_ULT',
            ip   : '172.16.0.151'
        },
        {
            name : 'WIN_ULT',
            ip   : '172.16.0.151'
        },
        {
            name : 'WIN_ULT',
            ip   : '172.16.0.151'
        },
        {
            name : 'WIN_ULT',
            ip   : '172.16.0.151'
        }
    ];

    refreshText: string;
    checking = false;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.refreshText = this.LANG.servers.refresh();
    }

    ngOnDestroy(): void {}

    ngOnInit() {
        console.log('overlaymodal called?', this.LANG.servers.autoRefresh);
    }

    checkOtherServer(server) {
        this.checking = true;
        this.refreshText = this.LANG.servers.refreshing();

        this.checking = false;
        this.refreshText = this.LANG.servers.refresh();
    }
}
