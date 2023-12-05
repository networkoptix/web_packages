import { CommonModule } from '@angular/common';
import { Component, Input, ViewEncapsulation } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { SubscriptionLike } from 'rxjs';

import { NxButtonComponent } from '@components/button/button.component';
import { NxFooterComponent } from '@components/footer/footer.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { icons } from '@static-variables';
import { COLLAPSE_SECOND_WIDTH } from '@styles/theme-variables-common';

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
    selector: 'nx-page-generic-placeholder-v2',
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
    ],
})
export class NxPagePlaceholderGenericV2Component {
    @Input() image?: string;
    @Input() title?: string;
    @Input() message?: string;
    @Input() description?: string;
    @Input() button?: NxButtonComponent;

    LANG = staticLang;

    iconName: string;
    iconSize: number;
    iconVisible: boolean;

    windowSizeSubscription: SubscriptionLike;
    icons = icons;

    constructor(
        // private translateService: TranslateService,
        private scrollMechanicsService: NxScrollMechanicsService,
    ) {
        this.iconSize = 400;

        this.windowSizeSubscription = this.scrollMechanicsService.windowSizeSubject.subscribe(
            ({ height, width }) => {
                this.iconSize = width <= COLLAPSE_SECOND_WIDTH ? 200 : 400;
                this.iconVisible = height > 580;
            },
        );
    }
}
