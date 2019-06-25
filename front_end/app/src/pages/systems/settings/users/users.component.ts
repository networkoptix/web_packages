import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Location }                             from '@angular/common';
import { ActivatedRoute }                       from '@angular/router';
import { NxConfigService }                      from '../../../../services/nx-config';
import { TranslateService }                     from '@ngx-translate/core';

import { NxPageService }    from '../../../../services/page.service';
import { NxDialogsService } from '../../../../dialogs/dialogs.service';

@Component({
    selector   : 'nx-system-user-component',
    templateUrl: 'users.component.html',
    styleUrls  : ['users.component.scss']
})

export class NxSystemUsersComponent implements OnInit, OnDestroy {
    CONFIG: any = {};
    LANG: any = {};
    location: any;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();
        this.translate
            .getTranslation(this.translate.currentLang)
            .subscribe((lang) => {
                this.LANG = lang;
                this.pageService.setPageTitle(this.LANG.pageTitles.systems);
            });
    }

    constructor(@Inject('account') private account: any,
                @Inject('authorizationCheckService') private authorizationService: any,
                @Inject('process') private process: any,
                @Inject('systemsProvider') private systemsProvider: any,
                @Inject('urlProtocol') private urlProtocol: any,
                private route: ActivatedRoute,
                private configService: NxConfigService,
                private translate: TranslateService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                location: Location) {

        this.location = location;
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnDestroy(): void {

    }

}

