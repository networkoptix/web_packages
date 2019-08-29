import { Component, OnInit }         from '@angular/core';
import { Location }                  from '@angular/common';
import { ActivatedRoute }            from '@angular/router';
import { NxConfigService }           from '../../../services/nx-config';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';

import { NxPageService }        from '../../../services/page.service';
import { NxDialogsService }     from '../../../dialogs/dialogs.service';
import { NxSystemsService }     from '../../../services/systems.service';
import { NxAccountService }     from '../../../services/account.service';
import { NxUrlProtocolService } from '../../../services/url-protocol.service';
import { NxProcessService }     from '../../../services/process.service';

@Component({
    selector   : 'nx-no-systems',
    templateUrl: 'no-systems.component.html',
    styleUrls  : ['no-systems.component.scss']
})

export class NxNoSystemsComponent implements OnInit {
    CONFIG: any = {};
    LANG: any = {};

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();

        this.pageService.setPageTitle(this.LANG.pageTitles.systems);
    }

    constructor(
                private urlProtocol: NxUrlProtocolService,
                private route: ActivatedRoute,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private systemsService: NxSystemsService,
                private accountService: NxAccountService,
                private processService: NxProcessService,
                private location: Location,
    ) {
        // this.location = location;
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.CONFIG = this.configService.getConfig();
    }
}

