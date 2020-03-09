import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { NxLanguageProviderService }                   from '../../../services/nx-language-provider';
import { NxConfigService } from '../../../services/nx-config/nx-config.service';
import { IConfig } from '../../../services/nx-config/config-types';
import { LanguageI18NStaticTypes } from '../../../../language_i18n_static_types';

/* Usage
<nx-page-placeholder
     type?="500 | 404 | NO_ALERTS | OFFLINE | NO_CAMS..."
     -- OR ---
     iconClass?='server-offline'
     placeholderTitle?='SERVER OFFLINE'
     message?='Warning! Dragons ahead!'
     preloader?=BOOLEAN
     [condition]= WHEN_TO_SHOW >
</nx-page-placeholder>
*/

@Component({
    selector: 'nx-page-placeholder',
    templateUrl: 'page-placeholder.component.html',
    styleUrls: ['page-placeholder.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxPagePlaceholderComponent implements OnInit {
    @Input() type: string;
    @Input() iconClass: string;
    @Input() placeholderTitle: string;
    @Input() message: string;
    @Input() preloader: boolean;
    @Input() condition: boolean;
    @Input() withFooter: boolean;
    @Input() constrainWidth: boolean;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    iconName: string;

    constructor(private configService: NxConfigService,
                private languageService: NxLanguageProviderService,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.languageService.getTranslations();
    }

    ngOnInit() {
        if (this.type) {
            if (!this.preloader && !this.condition) {
                this.preloader = false;
                this.condition = true;
            }

            switch (this.type) {
                case 'NO_CAMS' :
                    this.placeholderTitle = this.LANG.common.systemHasNoCameras;
                    this.message = this.LANG.common.systemHasNoCamerasMessage;
                    this.iconName = 'NoCams';
                    break;
                case 'OFFLINE' :
                    this.placeholderTitle = this.LANG.common.systemOffline;
                    this.message = this.LANG.common.systemOfflineMessage;
                    this.iconName = 'Offline';
                    break;
                case 'NO_ALERTS' :
                    this.placeholderTitle = this.LANG.common.systemNoAlerts;
                    this.message = this.LANG.common.systemNoAlertsMessage;
                    this.iconName = 'NoActions';
                    break;
                case '500' :
                    this.placeholderTitle = this.LANG.common.systemServerError;
                    this.message = this.LANG.common.systemServerErrorMessage;
                    this.iconName = '500';
                    break;
                case 'NEW_VERSION' :
                    this.placeholderTitle = this.LANG.common.systemNewVersion;
                    this.message = this.LANG.common.systemNewVersionMessage;
                    this.iconName = 'NewVersion';
                    break;
                case 'ACCOUNT_CREATED' :
                    this.placeholderTitle = this.LANG.common.account.created.title;
                    this.iconName = 'SendEmail';
                    break;
                case 'ACCOUNT_ACTIVATED' :
                    this.placeholderTitle = this.LANG.common.account.activated.title;
                    this.message = '';
                    this.iconName = 'Activated';
                    break;
                case 'FAILED_TO_ACCESS_SYSTEM':
                    this.placeholderTitle = this.LANG.pageTitles.failedToAccessSystem;
                    this.message = this.LANG.errorCodes.failedToAccessSystem;
                    this.iconName = 'NoAccess';
                    break;
                case '404' :
                    this.placeholderTitle = this.LANG.pageTitles.pageNotFound
                    this.message = '';
                    this.iconName = '404';
                    break;
            }
        }
    }
}
