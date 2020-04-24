import {
    Component, Input, OnDestroy, OnInit,
    ViewEncapsulation
} from '@angular/core';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxConfigService, IConfig }  from '../../../services/nx-config';
import { LanguageI18NStaticTypes }   from '../../../../language_i18n_static_types';
import { NxScrollMechanicsService }  from '../../../services/scroll-mechanics.service';
import { SubscriptionLike }          from 'rxjs';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';

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

@AutoUnsubscribe()
@Component({
    selector      : 'nx-page-placeholder',
    templateUrl   : 'page-placeholder.component.html',
    styleUrls     : ['page-placeholder.component.scss'],
    encapsulation : ViewEncapsulation.None
})
export class NxPagePlaceholderComponent implements OnInit, OnDestroy {
    @Input() type: string;
    @Input() iconClass: string;
    @Input() placeholderTitle: string;
    @Input() message: string;
    @Input() preloader: boolean;
    @Input() condition: boolean;
    @Input() withFooter: any;
    @Input() constrainWidth: boolean;
    @Input() data: any;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    iconName: string;
    iconSize: number;
    iconVisible: boolean;

    windowSizeSubscription: SubscriptionLike;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private scrollMechanicsService: NxScrollMechanicsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();

        this.iconSize = 400;

        this.windowSizeSubscription = this.scrollMechanicsService
            .windowSizeSubject
            .subscribe(({ height, width }) => {
                this.iconSize = (width <= 768) ? 200 : 400; // $collapse-second-width : 768px;
                this.iconVisible = (height > 580);
            });
    }

    ngOnDestroy(): void {}

    ngOnInit() {
        this.withFooter = (this.withFooter !== undefined);

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
                case 'OFFLINE_INACCESSIBLE' :
                    this.placeholderTitle = this.LANG.common.systemOffline;
                    this.message = this.LANG.common.inaccessibleFeatureMessage;
                    this.iconName = 'Wrong';
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
                    this.placeholderTitle = this.LANG.pageTitles.pageNotFound;
                    this.message = '';
                    this.iconName = '404';
                    break;
                case 'MERGE':
                    this.placeholderTitle = this.LANG.placeholderTexts.merge.title
                        .replace('{{systemName}}', this.data.systemName);
                    this.message =
                        `<p>${this.LANG.placeholderTexts.merge.message.dependingOnSize}</p>
                        <p class="mt-2">${this.LANG.placeholderTexts.merge.message.untilFinished}</p>
                        <p class="mt-2">${this.LANG.placeholderTexts.merge.message.whenFinished.replace('{{systemName}}', this.data.systemName)}`;
                    this.iconName = 'Merge';
                    break;
                case 'SERVER_OFFLINE':
                    this.placeholderTitle = this.LANG.placeholderTexts.server.title;
                    this.message = this.LANG.placeholderTexts.server.message;
                    this.iconName = 'Offline';
            }
        }
    }
}
