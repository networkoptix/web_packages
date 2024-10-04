import { CommonModule } from '@angular/common';
import { booleanAttribute, Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { SubscriptionLike } from 'rxjs';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { icons } from '@static-variables';
import { COLLAPSE_SECOND_WIDTH } from '@styles/theme-variables-common';
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
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        NxFooterComponent,
        PipesModule,
        NxAddSvgSrcDirective,
        RouterLink,
    ],
})
export class NxPagePlaceholderComponent implements OnInit {
    @Input() type: string;
    @Input() iconClass: string;
    @Input() placeholderTitle: string | { params: { systemName: string }; value: string };
    @Input() message: string;
    @Input({ transform: booleanAttribute }) preloader: boolean;
    @Input() condition: boolean;
    @Input({ transform: booleanAttribute }) withFooter: boolean;
    @Input({ transform: booleanAttribute }) constrainWidth: boolean;
    @Input() data: { systemName: string };
    @Input({ transform: booleanAttribute }) showMainButton: boolean = false;
    @Input({ transform: booleanAttribute }) addPadding: boolean = true;

    LANG = staticLang;

    iconName: string;
    iconSize: number;
    iconVisible: boolean;

    windowSizeSubscription: SubscriptionLike;
    icons = icons;

    constructor(private scrollMechanicsService: NxScrollMechanicsService) {
        this.iconSize = 400;

        this.windowSizeSubscription = this.scrollMechanicsService.windowSizeSubject.subscribe(
            ({ height, width }) => {
                this.iconSize = width <= COLLAPSE_SECOND_WIDTH ? 200 : 400;
                this.iconVisible = height > 580;
            },
        );
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
                case 'OFFLINE':
                    this.placeholderTitle = this.LANG.common.systemOffline;
                    this.message = this.LANG.common.systemOfflineMessage;
                    this.iconName = 'Offline';
                    break;
                case 'OFFLINE_INACCESSIBLE':
                    this.placeholderTitle = this.LANG.common.systemOffline;
                    this.message = this.LANG.common.inaccessibleFeatureMessage;
                    this.iconName = 'Wrong';
                    break;
                case 'NO_ALERTS':
                    this.placeholderTitle = this.LANG.common.systemNoAlerts;
                    this.message = this.LANG.common.systemNoAlertsMessage;
                    this.iconName = 'NoActions';
                    break;
                case '500':
                    this.placeholderTitle = this.LANG.common.systemServerError;
                    this.message = this.LANG.common.systemServerErrorMessage;
                    this.iconName = '500';
                    break;
                case 'NEW_VERSION':
                    this.placeholderTitle = this.LANG.common.systemNewVersion;
                    this.message = this.LANG.common.systemNewVersionMessage;
                    this.iconName = 'NewVersion';
                    break;
                case 'ACCOUNT_CREATED':
                    this.placeholderTitle = this.LANG.common.account.created.title;
                    this.iconName = 'SendEmail';
                    break;
                case 'ACCOUNT_ACTIVATED':
                    this.placeholderTitle = this.LANG.common.account.activated.title;
                    this.message = '';
                    this.iconName = 'Activated';
                    break;
                case 'FAILED_TO_ACCESS_SYSTEM':
                    this.placeholderTitle = this.LANG.pageTitles.failedToAccessSystem;
                    this.message = this.LANG.errorCodes.failedToAccessSystem;
                    this.iconName = 'NoAccess';
                    break;
                case 'SYSTEM_SUSPENDED_SHUTDOWN':
                    this.placeholderTitle = {
                        value: this.LANG.pageTitles.systemSuspendedShutdown,
                        params: { systemName: this.data.systemName },
                    };
                    this.message = this.LANG.errorCodes.systemSuspendedShutdown;
                    this.iconName = 'NoAccess';
                    break;
                case 'FAILED_TO_ACCESS_CAMERA':
                    this.placeholderTitle = this.LANG.pageTitles.failedToAccessCamera;
                    this.message = this.LANG.errorCodes.failedToAccessCamera;
                    this.iconName = 'NoAccess';
                    break;
                case 'FAILED_TO_ACCESS_2FA':
                    this.placeholderTitle = {
                        value: this.LANG.pageTitles.failedToAccess2FA,
                        params: { systemName: this.data.systemName },
                    };
                    this.message = this.LANG.errorCodes.failedToAccess2FA;
                    this.iconName = 'NoAccess';
                    break;
                case '404':
                    this.placeholderTitle ||= this.LANG.pageTitles.pageNotFound;
                    this.message = '';
                    this.iconName = '404';
                    break;
                case 'NO_SYSTEM_FOUND_API_TOOL':
                    this.iconName = '404';
                    this.message = '';
                    this.placeholderTitle = this.LANG.placeholderTexts.noSystemApiTool.title;
                    break;
                case 'SYSTEM_FAILED_TO_LOAD_API_TOOL':
                    this.iconName = '404';
                    this.message = '';
                    this.placeholderTitle =
                        this.LANG.placeholderTexts.systemLoadFailureApiTool.title;
                    break;
            }
        }
    }
}
