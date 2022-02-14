import {
    Component,
    OnDestroy,
    OnInit,
    Renderer2,
    Inject
} from '@angular/core';
import {
    ActivatedRoute,
    NavigationEnd,
    Event,
    Router,
    RoutesRecognized
} from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { sum } from 'lodash-es';
import {
    Subscription,
    BehaviorSubject,
    combineLatest,
    fromEvent,
    SubscriptionLike
} from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSessionService } from '@services/session.service';
import { NxStorageService } from '@services/storage.service';
import { NxSystemService } from '@services/system.service/system.service';
import type { NxSystem } from '@services/system.service/system/system';
import { NxSystemsService } from '@services/systems.service';
import { WINDOW } from '@services/window-provider';

class CombinedWidths {
    constructor(
        public totalWidths: number = 0,
        public icon: number = 0,
        public mainButton: number = 0,
        public tabs: number = 0,
        public rightNav: number = 0,
        public windowWidth: number = 0,
        public breadcrumbWidths: number[] = []
    ) {}
}

enum sizes {
    SM=24,
    MD=48,
    LG=72,
    XL=96
}

enum breakpoints {
    SM=576,
    MD=768,
    LG=992,
    XL=1200
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-header',
    templateUrl: 'header.component.html',
    styleUrls: [environment.isLocal ? 'header-webadmin.component.scss' : 'header.component.scss']
})
export class NxHeaderComponent implements OnInit, OnDestroy {
    authorizeUrl = '/authorize';
    CONFIG: IConfig;
    readonly environment = environment;
    LANG: LanguageI18NStaticTypes;

    createUrl: string;
    userEmail: string;
    canSeeInfo: boolean;
    system: NxSystem;
    systems: any;
    systemId: any;
    active: any = {};
    singleSystem: any = {};
    inline;
    navVisible: boolean;
    dropdownsVisible: boolean;
    viewHeader: boolean;
    systemCounter: number;
    loginState;
    hideWebAdmin = false;

    // Observables used to manage component view states for adaptive views
    showIcon$ = new BehaviorSubject(true);
    showSmallRightNav$ = new BehaviorSubject(false);
    showTabs$ = new BehaviorSubject(true);
    hideTabsAndDropdown$ = new BehaviorSubject(false);
    menuTabsCollapsed$ = new BehaviorSubject(0);
    hiddenBreadcrumbs$ = new BehaviorSubject(0);

    // Observables used for tracking element sizes
    // If additional elements need to be tracked use (resize) directive on those elements to track sizes
    iconWidth$ = new BehaviorSubject(0);
    mainButtonWidth$ = new BehaviorSubject(0);
    rightNavWidth$ = new BehaviorSubject(0);
    rightNavWidthCollapsed$ = new BehaviorSubject(0);
    tabsWidth$ = new BehaviorSubject(0);
    windowWidth$ = new BehaviorSubject(0);
    breadcrumbWidth$ = new BehaviorSubject<number[]>([])
    combinedWidths$ = new BehaviorSubject(new CombinedWidths());

    getUrlSystemId;
    untilHaveID;
    private headerSubscription: Subscription;
    private loginSubscription: Subscription;
    private routerSubscription: Subscription;
    private systemSubscription: Subscription;
    private menuSubscription: SubscriptionLike;
    private resizeSubscription: SubscriptionLike;
    private widthSubscription: SubscriptionLike;
    private queryParamSubscription: SubscriptionLike;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private renderer: Renderer2,
        private appState: NxAppStateService,
        private route: ActivatedRoute,
        private systemsService: NxSystemsService,
        private systemService: NxSystemService,
        private accountService: NxAccountService,
        private sessionService: NxSessionService,
        private storageService: NxStorageService,
        private router: Router,
        public headerService: NxHeaderService,
        private menusService: NxMenusService,
        @Inject(WINDOW) private window: Window,
        private bootstrapProvider: NxBootstrapProvider
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.menuSubscription = this.menusService.getMenu('header', true).subscribe(header => {
            this.headerService.nodes = this.menusService.cleanEmptyNodes(header.nodes);
        });
        // Updates windowWidth$ behavior subject on window resize
        this.resizeSubscription = fromEvent(this.window, 'resize').pipe(
            map((event: any) => event.target.innerWidth as number),
            startWith(this.window.innerWidth)
        ).subscribe(width => this.windowWidth$.next(width));

        // Combines all tracked element sizes into a flattened observable and updates combinedWidths$ with latest values
        this.widthSubscription = combineLatest([
            this.iconWidth$,
            this.mainButtonWidth$,
            this.tabsWidth$,
            this.rightNavWidth$,
            this.windowWidth$,
            this.breadcrumbWidth$
        ]).pipe(
            map(([icon, mainButton, tabs, rightNav, windowWidth, breadcrumbWidths]) => ({
                totalWidths: icon + mainButton + tabs + rightNav + sum(breadcrumbWidths),
                icon,
                mainButton,
                tabs,
                rightNav,
                windowWidth,
                breadcrumbWidths
            }))
        ).subscribe(combinedWidths => this.combinedWidths$.next(combinedWidths));

        // This handles the adaptive behavior of the header, in most cases navWidth is used to toggle different component views
        // For cases where the component view to use is determined by breakpoint, that logic should be implemented here instead of CSS
        // It's non-standard but will make the code easier to reason about when all logic for determining component size/views are in one place
        this.combinedWidths$.subscribe(({
            totalWidths,
            icon,
            mainButton,
            tabs,
            rightNav,
            windowWidth,
            breadcrumbWidths
        }) => {
            const padding: sizes = sizes.SM;
            const nodes = !!headerService.currentLocation.parentNode?.nodes;
            const breadcrumbs = this.filterBreadcrumbs(headerService.currentLocation?.breadcrumbs);
            const hiddenBreadcrumbsButtonSize = 40;

            // Used to keep track of element total widths at different states of updating the view states
            let navWidth = totalWidths + padding;

            // Used for keeping track of component view states
            let showIcon = true;
            let showSmallRightNav = false;
            let showTabs = true;
            let hideTabsAndDropdown = false;
            let hiddenBreadcrumbs = 0;

            // The code below is purposefully kept really imperative and with little abstraction to keep it easy to understand
            // All component views start at largest state and gets toggled to smaller versions in the order that the if statements are ran
            // The navWidth gets updated on each component view state change
            // In cases where a smaller view needs to be used on a component most likely there will be one or more previously checked
            // components where you'll want check if there is now room.
            if (navWidth > windowWidth && breadcrumbs.length) {
                navWidth += hiddenBreadcrumbsButtonSize;
                while (navWidth > windowWidth && hiddenBreadcrumbs < breadcrumbs.length) {
                    navWidth -= breadcrumbWidths[hiddenBreadcrumbs];
                    hiddenBreadcrumbs += 1;
                }
            }

            if (!nodes) {
                navWidth = navWidth - tabs;
            }

            if (windowWidth < breakpoints.LG) {
                showSmallRightNav = true;
                const collapsedSize: sizes = this.environment.isLocal ? sizes.XL : sizes.MD;
                const widthDifference = rightNav - this.rightNavWidthCollapsed$.value;
                navWidth = navWidth - widthDifference + collapsedSize;
            }

            if (windowWidth < breakpoints.MD) {
                showIcon = false;
                navWidth = navWidth - icon;
            }

            if (navWidth > windowWidth && nodes) {
                showTabs = false;
                const widthDifference = tabs - this.menuTabsCollapsed$.value;
                navWidth = navWidth - widthDifference;
            }

            if (navWidth > windowWidth && nodes) {
                hideTabsAndDropdown = true;
                navWidth = navWidth - this.menuTabsCollapsed$.value;
            }

            // if ((navWidth + rightNav - this.rightNavWidthCollapsed$.value) < windowWidth) {
            //     showSmallRightNav = false;
            // }

            // Updates view states to be used by template
            this.showIcon$.next(showIcon);
            this.showSmallRightNav$.next(showSmallRightNav);
            this.showTabs$.next(showTabs);
            this.hideTabsAndDropdown$.next(hideTabsAndDropdown);
            this.hiddenBreadcrumbs$.next(hiddenBreadcrumbs);
        });

        if (!environment.production) {
            this.authorizeUrl = `https://${environment.cloudHost}/authorize?redirect_url=${this.window.location.href}`;
        }
        this.createUrl = `${this.authorizeUrl}${environment.production ? '?' : '&'}client_type=create`;
    }

    private isActive(val: string) {
        return this.router.url.includes(val);
    }

    private stopActiveSubscription() {
        if (this.system) {
            this.system.stopPoll();
            this.system = undefined;
        }
    }

    updateBreadcrumbSizes = wrapper => this.breadcrumbWidth$.next(
        <number[]>Array.from(
            wrapper.children
        ).map((
            element: HTMLElement
        ) => parseInt(
            this.window.getComputedStyle(
                element
            ).getPropertyValue(
                'margin-right'
            )) + element.offsetWidth)
    )

    ngOnDestroy() {}

    ngOnInit() {
        this.queryParamSubscription = this.route.queryParams.subscribe(params => {
            this.inline = params.inline !== 'undefined';
        });

        this.navVisible = false;
        this.dropdownsVisible = false;
        this.viewHeader = this.CONFIG.showHeaderAndFooter;
        this.active = {};

        this.headerSubscription = this.appState.headerVisibleSubject.subscribe(visible => {
            this.viewHeader = visible || this.bootstrapProvider.newSystem;
        });

        this.routerSubscription = this.router.events
            .subscribe((event: Event) => {
                if (event instanceof RoutesRecognized) {
                    this.systemId = event.state.root.firstChild.params.systemId || '';
                    this.storageService.systemId = this.systemId;
                    this.updateActiveSystem();
                    this.updateActive();
                }

                if (this.userEmail && event instanceof NavigationEnd) {
                    // You only receive NavigationEnd events
                    if (this.systemId && !this.systems) {
                        this.systemsService
                            .forceUpdateSystems()
                            .toPromise().then(() => {
                                this.updateActiveSystem();
                                this.updateActive();
                            });
                    } else {
                        this.updateActiveSystem();
                        this.updateActive();
                    }
                    this.headerService.setLocation(event.url);
                    this.headerService.show$ = false;
                }
            });

        this.loginSubscription = this.sessionService.loginStateSubject
            .subscribe((loginState: string) => {
                if (loginState) {
                    this.userEmail = loginState;
                    this.dropdownsVisible = true;
                    this.loginState = true;
                    this.renderer.removeClass(document.body, 'anonymous');
                    this.renderer.addClass(document.body, 'authorized');
                    if (!this.environment.isLocal) {
                        setTimeout(() => {
                            this.systemsService
                                .forceUpdateSystems(this.userEmail)
                                .toPromise()
                                .then(() => this.updateActive());
                        });
                    }
                } else {
                    this.loginState = false;
                    this.renderer.removeClass(document.body, 'authorized');
                    this.renderer.addClass(document.body, 'anonymous');
                }
                setTimeout(() => this.renderer.removeClass(document.body, 'loading'));
            });

        if (this.environment.isLocal) {
            this.hideWebAdmin = true;
            this.accountService.get().then(account => {
                this.hideWebAdmin = !account || this.bootstrapProvider.newSystem;
                if (!account || this.bootstrapProvider.newSystem) {
                    return;
                }
                this.system = this.systemService.createLocalSystem(
                    this.accountService.mediaServerApi,
                    account?.id,
                    account?.email
                );
                this.system.update().then(() => {
                    this.singleSystem = true;
                    this.systemCounter = 1;
                    this.system.infoSubject
                        .pipe(untilDestroyed(this))
                        .subscribe(system => {
                            this.systems = [system];
                            this.updateActiveSystem();
                            this.updateActive();
                            this.headerService.activeSystem = system?.moduleInfo;
                        });
                });
            });
        } else {
            this.systemSubscription = this.systemsService.systemsSubject.subscribe(systems => {
                if (!systems) {
                    return;
                }

                this.systemId = this.storageService.systemId;
                if (this.router.url.startsWith('/systems/')) {
                    this.systemId = this.router.url.split('/')[2].split('?')[0];
                }

                if (
                    !this.systemId &&
                    this.route.firstChild &&
                    this.route.firstChild.snapshot.params.systemId
                ) {
                    this.systemId = this.route.firstChild.snapshot.params.systemId;
                }
                this.systems = systems;
                this.singleSystem = (this.systems.length === 1);
                this.systemCounter = this.systems.length;

                this.updateActiveSystem();
                this.updateActive();
            });
        }
    }

    onClick(event) {
        if (
            this.systemId &&
            this.isActive(event.target.id) &&
            !this.isActive('view') && !this.isActive('health')
        ) {
            event.stopPropagation();
            return false;
        } else if (event.target.id === 'systems') {
            return true;
        }

        if (this.isActive(event.target.id)) {
            event.stopPropagation();
            return false;
        }
    }

    logout() {
        this.accountService.logout(true);
    }

    updateActive() {
        this.active.ipvd = this.isActive('/ipvd');
        this.active.integrations = this.isActive('/integrations');
        this.active.register = this.isActive('/authorize/register');
        this.active.view = this.isActive('/view');
        this.active.information = this.isActive('/health');
        this.active.bookmarks = this.isActive('/bookmarks');
        this.active.settings = this.systemId &&
            this.isActive('/systems') &&
            !this.isActive('/view') &&
            !this.isActive('/health') &&
            !this.isActive('/bookmarks');
        this.navVisible = true;
    }

    updateActiveSystem() {
        if (!this.systems) {
            return;
        }
        if (this.singleSystem || this.environment.isLocal) { // Special case for a single system - it always active
            this.headerService.activeSystem = this.systems[0];
        } else if (this.systemId) {
            this.headerService.activeSystem = this.systems.find(system => {
                return this.systemId === system.id;
            });
        } else {
            this.headerService.activeSystem = undefined;
        }

        if (!this.environment.isLocal) {
            if (this.headerService.activeSystem) {
                if (!this.system || this.system.id !== this.systemId) {
                    this.stopActiveSubscription();
                    this.system = this.systemService.createSystem(
                        this.userEmail,
                        this.headerService.activeSystem.id
                    );

                    this.system.getInfoAndPermissions(false)
                        .then(system => {
                            this.canSeeInfo = system?.canViewInfo() || false;
                        })
                        .catch(_ => {});
                }
            } else {
                this.stopActiveSubscription();
            }
        }
    }

    canShowNav() {
        return this.navVisible &&
            this.headerService.activeSystem &&
            !this.active.integrations &&
            !this.active.ipvd;
    }

    filterBreadcrumbs([_, ...nodes] = []) {
        return (nodes || []).filter(({ url }) => url);
    }

    get filteredBreadcrumbs() {
        return this.filterBreadcrumbs(this.headerService.currentLocation?.breadcrumbs);
    }

    get mainUrl() {
        if (this.environment.isLocal) {
            return '/view';
        }

        if (!this.userEmail) {
            return '/';
        }

        if (this.singleSystem && this.headerService.activeSystem?.id) {
            return `/systems/${this.headerService.activeSystem.id}/view`;
        }

        return this.CONFIG.featureFlags.dashboardRedirect ? '/dashboard' : '/';
    }

    get mainNode() {
        return this.headerService.currentLocation.parentNode?.breadcrumbs?.[0] ||
            this.headerService.currentLocation.parentNode;
    }
}
