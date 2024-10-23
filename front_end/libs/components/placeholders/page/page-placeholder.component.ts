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
        }
    }
}
