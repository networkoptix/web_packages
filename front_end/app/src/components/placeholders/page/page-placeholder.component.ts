import {
    Component,
    Input,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { IBool, CoercedBoolInput } from '@decorators/ibool';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NgChanges } from '@utils/ng-changes';

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

@UntilDestroy({ checkProperties: true })
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
    @IBool() @Input() preloader: CoercedBoolInput;
    @IBool() @Input() condition: CoercedBoolInput;
    @IBool() @Input() withFooter: CoercedBoolInput;
    @IBool() @Input() constrainWidth: CoercedBoolInput;
    @Input() data: { systemName: string };
    @IBool() @Input() showMainButton: CoercedBoolInput = false;
    @IBool() @Input() addPadding: CoercedBoolInput = true;

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
        this.LANG = languageService.translations;

        this.iconSize = 400;

        this.windowSizeSubscription = this.scrollMechanicsService
            .windowSizeSubject
            .subscribe(({ height, width }) => {
                this.iconSize = (width <= 768) ? 200 : 400; // $collapse-second-width : 768px;
                this.iconVisible = (height > 580);
            });
    }

    ngOnInit(): void {
        this.setupPlaceholder();
    }

    ngOnChanges(changes: NgChanges<NxPagePlaceholderComponent>): void {
        if (!changes.data?.firstChange) {
            this.setupPlaceholder();
        }
    }

    setupPlaceholder(): void {
        if (this.type) {
            if (!this.preloader && !this.condition) {
                this.preloader = false;
                this.condition = true;
            }

            switch (this.type) {
                case 'NO_CAMS' :
                    this.placeholderTitle = this.LANG.common.systemHasNoCameras();
                    this.message = this.LANG.common.systemHasNoCamerasMessage();
                    this.iconName = 'NoCams';
                    break;
                case 'OFFLINE' :
                    this.placeholderTitle = this.LANG.common.systemOffline();
                    this.message = this.LANG.common.systemOfflineMessage();
                    this.iconName = 'Offline';
                    break;
                case 'OFFLINE_INACCESSIBLE' :
                    this.placeholderTitle = this.LANG.common.systemOffline();
                    this.message = this.LANG.common.inaccessibleFeatureMessage();
                    this.iconName = 'Wrong';
                    break;
                case 'NO_ALERTS' :
                    this.placeholderTitle = this.LANG.common.systemNoAlerts();
                    this.message = this.LANG.common.systemNoAlertsMessage();
                    this.iconName = 'NoActions';
                    break;
                case '500' :
                    this.placeholderTitle = this.LANG.common.systemServerError();
                    this.message = this.LANG.common.systemServerErrorMessage();
                    this.iconName = '500';
                    break;
                case 'NEW_VERSION' :
                    this.placeholderTitle = this.LANG.common.systemNewVersion();
                    this.message = this.LANG.common.systemNewVersionMessage();
                    this.iconName = 'NewVersion';
                    break;
                case 'ACCOUNT_CREATED' :
                    this.placeholderTitle = this.LANG.common.account.created.title();
                    this.iconName = 'SendEmail';
                    break;
                case 'ACCOUNT_ACTIVATED' :
                    this.placeholderTitle = this.LANG.common.account.activated.title();
                    this.message = '';
                    this.iconName = 'Activated';
                    break;
                case 'FAILED_TO_ACCESS_SYSTEM':
                    this.placeholderTitle = this.LANG.pageTitles.failedToAccessSystem();
                    this.message = this.LANG.errorCodes.failedToAccessSystem();
                    this.iconName = 'NoAccess';
                    break;
                case 'FAILED_TO_ACCESS_CAMERA':
                    this.placeholderTitle = this.LANG.pageTitles.failedToAccessCamera();
                    this.message = this.LANG.errorCodes.failedToAccessCamera();
                    this.iconName = 'NoAccess';
                    break;
                case 'FAILED_TO_ACCESS_2FA':
                    this.placeholderTitle = this.LANG.pageTitles.failedToAccess2FA({ systemName: this.data.systemName });
                    this.message = this.LANG.errorCodes.failedToAccess2FA();
                    this.iconName = 'NoAccess';
                    break;
                case '404' :
                    this.placeholderTitle = this.LANG.pageTitles.pageNotFound();
                    this.message = '';
                    this.iconName = '404';
                    break;
                case 'MERGE':
                    this.placeholderTitle = this.LANG.placeholderTexts.merge.title({ systemName: this.data.systemName });
                    this.message =
                        `
                        <p>${this.LANG.placeholderTexts.merge.message.dependingOnSize()}</p>
                        <p class="mt-2">${this.LANG.placeholderTexts.merge.message.untilFinished()}</p>
                        <p class="mt-2">${this.LANG.placeholderTexts.merge.message.whenFinished({ systemName: this.data.systemName })}`;
                    this.iconName = 'Merge';
                    break;
                case 'SERVER_OFFLINE':
                    this.placeholderTitle = this.LANG.placeholderTexts.server.title();
                    this.message = this.LANG.placeholderTexts.server.message();
                    this.iconName = 'Offline';
                    break;
                case 'NO_SETTINGS':
                    this.placeholderTitle = this.LANG.placeholderTexts.noSettings.title();
                    this.message = this.LANG.placeholderTexts.noSettings.message();
                    this.iconName = 'NoSettings';
                    break;
                case 'NO_SYSTEM_FOUND_API_TOOL':
                    this.iconName = '404';
                    this.message = '';
                    this.placeholderTitle = this.LANG.placeholderTexts.noSystemApiTool.title();
                    break;
                case 'SYSTEM_FAILED_TO_LOAD_API_TOOL':
                    this.iconName = '404';
                    this.message = '';
                    this.placeholderTitle = this.LANG.placeholderTexts.systemLoadFailureApiTool.title();
                    break;
            }
        }
    }
}
