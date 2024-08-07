import { CommonModule } from '@angular/common';
import {
    Component,
    ViewEncapsulation,
    ViewChild,
    ElementRef,
    ViewContainerRef,
    OnInit,
    HostBinding,
} from '@angular/core';
import {
    ActivationEnd,
    ActivationStart,
    Event as RouterEvent,
    GuardsCheckEnd,
    GuardsCheckStart,
    Router,
    RouterModule,
} from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { fromEvent } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { NxApplyComponent } from '@components/apply/apply.component';
import { NxNavFooterComponent } from '@components/nav-footer/nav-footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxTourStepComponent } from '@components/tour-step/tour-step.component';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { environment } from '@environments/environment';
import { NxAppStateService } from '@services/nx-app-state.service';
import { nxConfig } from '@services/nx-config/config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxThemeService } from '@services/theme.service';
import { NxUriService } from '@services/uri.service';

require('what-input');

@UntilDestroy()
@Component({
    selector: 'nx-legacy-cloud',
    template: ` <div
        *ngIf="themeSet"
        [style.height]="windowHeight + 'px'"
    >
        <div
            *ngIf="!reauthorizing"
            class="headerContainer"
            (resize)="headerResize($event)"
        >
            <ng-template #header></ng-template>
            <ng-template #ribbon></ng-template>
        </div>
        <div
            class="outerContainer"
            [ngStyle]="{
                height: appStateService.appContainerHeight,
                display: appStateService.ready || reauthorizing ? '' : 'none'
            }"
        >
            <div
                class="mainContainer"
                data-testid="mainContainer"
                [ngClass]="{
                    altMainBackground: appStateService.altBackground
                }"
                nxScrollHelper
                cdkScrollable
                #mainContainer
            >
                <nx-tour-step-component></nx-tour-step-component>
                <ng-template #cookieBanner></ng-template>
                <router-outlet></router-outlet>
            </div>
            <nx-nav-footer *ngIf="CONFIG.featureFlags.newHeader"></nx-nav-footer>
        </div>
        <ng-container *ngIf="!reauthorizing">
            <nx-pre-loader
                type="page"
                *ngIf="(!appStateService.ready && !CONFIG.newSystem) || loading"
            ></nx-pre-loader>
            <ng-template #appToast></ng-template>
        </ng-container>
    </div>`,
    styleUrls: ['./legacy-cloud.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        NxPreLoaderComponent,
        RouterModule,
        NxNavFooterComponent,
        NxTourStepComponent,
        NxApplyComponent,
        NxResizeObserver,
    ],
})
export class LegacyCloudAppComponent implements OnInit {
    CONFIG: IConfig = nxConfig;

    // This will disable all animations under nx-app. This won't apply to Dialogs since they're siblings
    @HostBinding('@.disabled') animationsDisabled = !this.CONFIG.featureFlags.enableAnimations;
    newSystem: boolean;
    loading: boolean;
    reauthorizing = window.location.href.includes('cloud-authorize');
    headerHeight: number;
    themeSet: boolean = false;
    windowHeight: number = window.innerHeight;

    @ViewChild('mainContainer') mainContainer: ElementRef<HTMLDivElement>;
    @ViewChild('header', { read: ViewContainerRef }) header: ViewContainerRef;
    @ViewChild('appToast', { read: ViewContainerRef }) appToast: ViewContainerRef;
    @ViewChild('ribbon', { read: ViewContainerRef }) ribbon: ViewContainerRef;
    @ViewChild('cookieBanner', { read: ViewContainerRef }) cookieBanner: ViewContainerRef;

    lazyLoadHeader = async (): Promise<void> => {
        await import('@components/header/header.component').then(m => m.NxHeaderComponent);
        const { NxHeaderComponent } = await import('@components/header/header.component');
        this.header.createComponent(NxHeaderComponent);
    };

    lazyLoadComponents = async (): Promise<void> => {
        // requestIdleCallback is not supported in Safari so the next best thing is setTimeout.
        const idle = (): Promise<unknown> =>
            new Promise(resolve =>
                window?.requestIdleCallback ? requestIdleCallback(resolve) : setTimeout(resolve),
            );

        await idle();
        await import('@components/toast-container/toast-container.module').then(
            m => m.ToastContainerModule,
        );
        const { NxToastsContainer } = await import('@components/toast-container/toast.component');
        this.appToast.createComponent(NxToastsContainer);
        if (nxConfig.featureFlags.cookieBanner) {
            await idle();
            const { NxCookieBannerComponent } = await import(
                '@components/cookie-banner/cookie-banner.component'
            );
            this.cookieBanner.createComponent(NxCookieBannerComponent);
        }

        await idle();
        await import('@components/ribbon/ribbon.module').then(m => m.RibbonModule);
        const { NxRibbonComponent } = await import('@components/ribbon/ribbon.component');
        this.ribbon.createComponent(NxRibbonComponent);
    };

    constructor(
        public appStateService: NxAppStateService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private uriService: NxUriService,
        private themeService: NxThemeService,
        private router: Router,
    ) {
        // Set Window height to accommodate mobile browser bars
        fromEvent(window, 'resize')
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this.windowHeight = window.innerHeight;
            });

        // Updates query params for components without routes.
        this.router.events
            .pipe(
                filter(
                    (event: RouterEvent) =>
                        event instanceof ActivationStart ||
                        event instanceof ActivationEnd ||
                        event instanceof GuardsCheckStart ||
                        event instanceof GuardsCheckEnd,
                ),
                untilDestroyed(this),
            )
            .subscribe(
                (event: ActivationStart | ActivationEnd | GuardsCheckStart | GuardsCheckEnd) => {
                    if (event instanceof GuardsCheckStart) {
                        const nextRoute = event.url?.split('?')?.[0];
                        const currentRoute = this.router.url?.split('?')?.[0];
                        this.loading = nextRoute !== currentRoute || nextRoute === '/';
                        return;
                    }
                    if (event instanceof GuardsCheckEnd) {
                        this.loading = false;
                        return;
                    }

                    if ('debug' in event.snapshot.queryParams) {
                        this.CONFIG.allowDebugMode = true;
                    }

                    this.uriService.queryParams = event.snapshot.queryParams;
                    if (this.mainContainer?.nativeElement) {
                        this.mainContainer.nativeElement.scrollTop = 0;
                    }
                },
            );
    }

    ngOnInit(): void {
        this.themeService.initTheme().finally(() => {
            this.themeSet = true;
            setTimeout(() => {
                this.initComponents();
                this.initScroll();
            });
        });
    }

    headerResize(size: { width: number; height: number }): void {
        if (this.headerHeight !== size.height) {
            this.appStateService.headerContainerHeight$.next(size.height);
            this.headerHeight = size.height;
        }
    }

    private initScroll(): void {
        fromEvent<Event>(this.mainContainer.nativeElement, 'scroll')
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this.scrollMechanicsService.windowScroll =
                    this.mainContainer.nativeElement.scrollTop;
            });

        this.scrollMechanicsService.windowScrollSubject
            .pipe(untilDestroyed(this))
            .subscribe(scroll => {
                const prevScroll = this.mainContainer.nativeElement.scrollTop;
                if (prevScroll !== scroll) {
                    // Only triggers on programmatically set scroll
                    this.mainContainer.nativeElement.scrollTop = scroll;
                }
            });
    }

    private initComponents(): void {
        if (!this.CONFIG.browserNotSupported) {
            if (environment.isLocal || this.appStateService.ready) {
                this.lazyLoadHeader();
            } else {
                this.appStateService.readySubject
                    .pipe(
                        filter(ready => ready),
                        take(1),
                    )
                    .subscribe(() => this.lazyLoadHeader());
            }
            this.lazyLoadComponents();
        }
    }
}
