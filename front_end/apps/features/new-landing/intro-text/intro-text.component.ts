import { Platform } from '@angular/cdk/platform';
import { DOCUMENT } from '@angular/common';
import {
    AfterViewChecked,
    Component,
    ElementRef,
    Inject,
    OnDestroy,
    ViewChild
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Observable, Subscription } from 'rxjs';
import { filter, startWith } from 'rxjs/operators';

import { IntersectionStatus } from '@directives/nx-intersection.directive.types';
import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { WINDOW } from '@services/window-provider';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';

@UntilDestroy()
@Component({
    selector: 'nx-intro-text',
    templateUrl: './intro-text.component.html',
    styleUrls: ['./intro-text.component.scss']
})
export class NxIntroTextComponent implements AfterViewChecked, OnDestroy {
    @ViewChild('createButton') createButtonRef: ElementRef<HTMLElement>;
    @ViewChild('rootFixed') rootFixedRef: ElementRef;
    @ViewChild('rootAbsolute') rootAbsoluteRef: ElementRef;
    realTimeScroll$: Observable<number>;
    elementObserver$: Subscription;
    cloudShowing: 'fixed' | 'absolute' = 'fixed';
    isLoggedIn: null | boolean = null;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        scrollMechanics: NxScrollMechanicsService,
        public headerService: NxHeaderService,
        public platform: Platform,
        @Inject(DOCUMENT) private document: Document,
        @Inject(WINDOW) private window: Window) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        // real-time scroll calculation for less jittery transition of
        // the element from position:fixed to position:absolute
        this.realTimeScroll$ = scrollMechanics.windowScrollSubject.pipe(
            startWith(0),
            untilDestroyed(this)
        );
    }

    routeToCreate(): void {
        let url = '/authorize?client_type=create';
        if (!environment.production) {
            url = `https://${environment.cloudHost}/authorize?redirect_uri=${this.window.location.href}&client_type=create`;
        }
        this.window.location.href = url;
    }

    checkVisible(elm: HTMLElement): boolean {
        const headerHeight = 48;
        const rect = elm.getBoundingClientRect();
        const viewHeight = Math.max(
            this.document.documentElement.clientHeight,
            this.window.innerHeight
        );
        return !(rect.bottom - headerHeight < 0 || rect.top - viewHeight >= 0);
    }

    changeHeaderButton = (visbility: IntersectionStatus): void => {
        if (visbility === 'Visible') {
            if (this.headerService.createAccountButtonType === 'primary') {
                this.headerService.createAccountButtonType = 'default';
            }
        }
        if (visbility === 'NotVisible') {
            if (this.headerService.createAccountButtonType === 'default') {
                this.headerService.createAccountButtonType = 'primary';
            }
        }
    };

    getElementPosition(elm: HTMLElement): { top: number, left: number } {
        const rect = elm.getBoundingClientRect();
        const scrollLeft = this.window.pageXOffset ||
            this.document.documentElement.scrollLeft;
        const scrollTop = this.window.pageYOffset ||
            this.document.documentElement.scrollTop;
        return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
    }

    ngOnDestroy(): void {
        if (this.headerService.createAccountButtonType === 'default') {
            this.headerService.createAccountButtonType = 'primary';
        }
    }

    ngAfterViewChecked(): void {
        // There are two hidden components in the html which determine if
        // the intro-text component is using position:absolute or position:fixed
        if (!this.elementObserver$ && this.rootFixedRef && this.rootAbsoluteRef) {
            this.elementObserver$ = this.realTimeScroll$
                .pipe(untilDestroyed(this), filter(value => value < 1000))
                .subscribe(() => {
                    if (
                        this.getElementPosition(this.rootAbsoluteRef.nativeElement).top >
                        this.getElementPosition(this.rootFixedRef.nativeElement).top
                    ) {
                        if (this.cloudShowing !== 'fixed') {
                            this.cloudShowing = 'fixed';
                        }
                    } else {
                        if (this.cloudShowing !== 'absolute') {
                            this.cloudShowing = 'absolute';
                        }
                    }
                });
        }
    }
}
