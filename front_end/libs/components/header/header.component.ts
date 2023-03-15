import { DOCUMENT } from '@angular/common';
import {
    Component,
    OnDestroy,
    OnInit,
    Renderer2,
    Inject,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import {
    ActivatedRoute,
    NavigationEnd,
    Event as RouterEvent,
    Router,
    RoutesRecognized,
} from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { sum } from 'lodash-es';
import { CookieService } from 'ngx-cookie-service';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import { BehaviorSubject, combineLatest, fromEvent } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import { icons } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSessionService } from '@services/session.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import { WINDOW } from '@services/window-provider';
import { GridBreakpoints } from '@styles/theme-variables-common';

class CombinedWidths {
    constructor(
        public totalWidths: number = 0,
        public icon: number = 0,
        public mainButton: number = 0,
        public tabs: number = 0,
        public rightNav: number = 0,
        public windowWidth: number = 0,
        public breadcrumbWidths: number[] = [],
    ) {}
}

enum sizes {
    SM = 24,
    MD = 48,
    LG = 72,
    XL = 96,
}

@UntilDestroy()
@Component({
    selector: 'nx-header',
    templateUrl: 'header.component.html',
    styleUrls: [environment.isLocal ? 'header-webadmin.component.scss' : 'header.component.scss'],
})
export class NxHeaderComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    readonly environment = environment;
    LANG = staticLang;

    userEmail: string;
    canSeeInfo: boolean;
    system: NxSystem;
    systems: NxSystemInfo[] | [NxSystem];
    systemId: any;
    active: any = {};
    singleSystem: any = {};
    inline;
    navVisible: boolean;
    dropdownsVisible: boolean;
    viewHeader: boolean;
    systemCounter: number;
    loginState: boolean | undefined = undefined;
    hideWebAdmin = false;
    newHeader = false;
    logoSrc: string;
    icons = icons;
    readonly showHeaderAndFooter: boolean = true;

    @ViewChild('newHeaderRef', { read: ViewContainerRef }) newHeaderRef: ViewContainerRef;

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
    breadcrumbWidth$ = new BehaviorSubject<number[]>([]);
    combinedWidths$ = new BehaviorSubject(new CombinedWidths());

    getUrlSystemId;
    untilHaveID;

    constructor(
        configService: NxConfigService,
        translateService: TranslateService,
        private renderer: Renderer2,
        private appState: NxAppStateService,
        private route: ActivatedRoute,
        private systemsService: NxSystemsService,
        private systemService: NxSystemService,
        private accountService: NxAccountService,
        private sessionService: NxSessionService,
        private storageService: LocalStorageService,
        private router: Router,
        public headerService: NxHeaderService,
        private menusService: NxMenusService,
        private sessionStorage: SessionStorageService,
        @Inject(WINDOW) private window: Window,
        private bootstrapProvider: NxBootstrapProvider,
        private cookieService: CookieService,
        @Inject(DOCUMENT) private document: Document,
    ) {
        this.CONFIG = configService.getConfig();

        translateService.onTranslationChange.pipe(untilDestroyed(this)).subscribe(() => {
            setTimeout(() => {
                this.getMenu();
            });
        });

        this.newHeader = this.CONFIG.featureFlags.newHeader;
        if (this.newHeader) {
            this.lazyLoadNewHeader();
        }
        setTimeout(() => {
            this.getMenu();
        });
        // Updates windowWidth$ behavior subject on window resize
        fromEvent<Event>(this.window, 'resize')
            .pipe(
                untilDestroyed(this),
                map(event => (event.target as Window).innerWidth),
                startWith(this.window.innerWidth),
            )
            .subscribe(width => this.windowWidth$.next(width));

        // Combines all tracked element sizes into a flattened observable and updates combinedWidths$ with latest values
        combineLatest([
            this.iconWidth$,
            this.mainButtonWidth$,
            this.tabsWidth$,
            this.rightNavWidth$,
            this.windowWidth$,
            this.breadcrumbWidth$,
        ])
            .pipe(
                untilDestroyed(this),
                map(([icon, mainButton, tabs, rightNav, windowWidth, breadcrumbWidths]) => ({
                    totalWidths: icon + mainButton + tabs + rightNav + sum(breadcrumbWidths),
                    icon,
                    mainButton,
                    tabs,
                    rightNav,
                    windowWidth,
                    breadcrumbWidths,
                })),
            )
            .subscribe(combinedWidths => this.combinedWidths$.next(combinedWidths));

        // This handles the adaptive behavior of the header, in most cases navWidth is used to toggle different component views
        // For cases where the component view to use is determined by breakpoint, that logic should be implemented here instead of CSS
        // It's non-standard but will make the code easier to reason about when all logic for determining component size/views are in one place
        this.combinedWidths$.subscribe(widths => {
            const { totalWidths, icon, tabs, rightNav, windowWidth, breadcrumbWidths } = widths;
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

            if (windowWidth < GridBreakpoints.LG) {
                showSmallRightNav = true;
                const collapsedSize: sizes = this.environment.isLocal ? sizes.XL : sizes.MD;
                const widthDifference = rightNav - this.rightNavWidthCollapsed$.value;
                navWidth = navWidth - widthDifference + collapsedSize;
            }

            if (windowWidth < GridBreakpoints.MD) {
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
            this.headerService.authorizeUrl = `https://${environment.cloudHost}/authorize?redirect_url=${this.window.location.href}`;
        }
        this.headerService.createUrl = `${this.headerService.authorizeUrl}${
            environment.production ? '?' : '&'
        }client_type=create`;

        NxConfigService.configChanged.subscribe(() => {
            this.logoSrc = `/static/images/${this.CONFIG.isDarkTheme ? 'dark_' : ''}logo.png`;
        });
    }

    private getMenu(): void {
        this.menusService
            .getMenu('header', true)
            .pipe(untilDestroyed(this))
            .subscribe(header => {
                const nodes = this.menusService.cleanEmptyNodes(header.nodes);
                this.headerService.setLocation(this.window.location.pathname);
                if (this.newHeader) {
                    if (!this.loginState) {
                        nodes.unshift(this.menusService.makeWelcomeNode());
                    } else {
                        nodes.unshift(this.menusService.makeSystemMenuNode());
                        nodes.push(this.menusService.makeAccountSettingsNode());
                        nodes.push(this.menusService.makeSystemGroupsNode());
                    }
                }
                this.headerService.nodes = nodes;

                this.headerService.setLocation(this.window.location.pathname);
            });
    }

    private isActive(val: string) {
        return this.router.url.includes(val);
    }

    private stopActiveSubscription(): void {
        if (this.system) {
            this.system.stopPoll();
            this.system = undefined;
        }
    }

    private async lazyLoadNewHeader() {
        await import('./new-header/new-header.module').then(m => m.NewHeaderModule);
        const { NxNewHeaderComponent } = await import('./new-header/new-header.component');
        const compRef = this.newHeaderRef.createComponent(NxNewHeaderComponent);
        compRef.instance.width = this.windowWidth$;
    }

    updateBreadcrumbSizes = wrapper =>
        this.breadcrumbWidth$.next(
            Array.from(wrapper.children).map(
                (element: HTMLElement) =>
                    parseInt(
                        this.window.getComputedStyle(element).getPropertyValue('margin-right'),
                    ) + element.offsetWidth,
            ),
        );

    ngOnDestroy(): void {}

    ngOnInit(): void {
        this.sessionStorage
            .observe('theme')
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                // wait CONFIG to update
                setTimeout(() => {
                    this.logoSrc = `/static/images/${
                        this.CONFIG.isDarkTheme ? 'dark_' : ''
                    }logo.png`;
                });
            });

        this.route.queryParams.pipe(untilDestroyed(this)).subscribe(params => {
            this.inline = params.inline !== 'undefined';
        });

        this.navVisible = false;
        this.dropdownsVisible = false;
        this.viewHeader = this.showHeaderAndFooter;
        this.active = {};

        this.appState.headerVisibleSubject.pipe(untilDestroyed(this)).subscribe(visible => {
            this.viewHeader = visible || this.bootstrapProvider.newSystem;
        });

        this.router.events.pipe(untilDestroyed(this)).subscribe((event: RouterEvent) => {
            if (event instanceof RoutesRecognized) {
                this.systemId = event.state.root.firstChild.params.systemId || '';
                this.storageService.store('systemId', this.systemId);
                this.updateActiveSystem();
                this.updateActive();
            }

            if (this.userEmail && event instanceof NavigationEnd) {
                // You only receive NavigationEnd events
                if (this.systemId && !this.systems) {
                    this.systemsService
                        .forceUpdateSystems()
                        .toPromise()
                        .then(() => {
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

        this.sessionService.loginStateSubject
            .pipe(untilDestroyed(this))
            .subscribe((loginState: string) => {
                if (loginState) {
                    this.userEmail = loginState;
                    this.dropdownsVisible = true;
                    this.loginState = true;
                    this.renderer.removeClass(this.document.body, 'anonymous');
                    this.renderer.addClass(this.document.body, 'authorized');
                    if (this.newHeader) {
                        const welcomeLang = this.LANG.appHeader.headerMenuNodes.welcome;
                        const systemLang = this.LANG.appHeader.headerMenuNodes.system;
                        if (
                            this.headerService.nodes.length &&
                            this.headerService.nodes[0].name !== systemLang.displayName
                        ) {
                            if (this.headerService.nodes[0].name === welcomeLang.displayName) {
                                this.headerService.nodes.shift();
                            }
                            const systemNode = this.menusService.makeSystemMenuNode();
                            const accountNode = this.menusService.makeAccountSettingsNode();
                            const systemGroupsNode = this.menusService.makeSystemGroupsNode();
                            this.headerService.nodes.unshift(systemNode);
                            this.headerService.nodes.push(accountNode);
                            this.headerService.nodes.push(systemGroupsNode);
                        }
                    }
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
                    this.renderer.removeClass(this.document.body, 'authorized');
                    this.renderer.addClass(this.document.body, 'anonymous');
                }
                setTimeout(() => this.renderer.removeClass(this.document.body, 'loading'));
            });

        if (this.environment.isLocal) {
            this.hideWebAdmin = true;
            if (this.bootstrapProvider.newSystem) {
                return;
            }
            this.accountService.get().then(account => {
                this.hideWebAdmin = !account;
                if (!account) {
                    return;
                }
                this.system = this.systemService.createLocalSystem(
                    this.accountService.mediaServerApi,
                    account?.id,
                    account?.email,
                );
                this.system.update().then(() => {
                    this.singleSystem = true;
                    this.systemCounter = 1;
                    this.system.infoSubject.pipe(untilDestroyed(this)).subscribe(system => {
                        this.systems = [system as NxSystem];
                        this.updateActiveSystem();
                        this.updateActive();
                        this.headerService.activeSystem = system?.serverManager.moduleInfo;
                    });
                });
            });
        } else {
            this.systemsService.systemsSubject.pipe(untilDestroyed(this)).subscribe(systems => {
                if (!systems) {
                    return;
                }

                this.systemId = this.storageService.retrieve('systemId');
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
                this.singleSystem = this.systems.length === 1;
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
            !this.isActive('view') &&
            !this.isActive('health')
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

    logout(): void {
        this.accountService.logout(true);
    }

    updateActive(): void {
        this.active.ipvd = this.isActive('/ipvd');
        this.active.integrations = this.isActive('/integrations');
        this.active.register = this.isActive('/authorize/register');
        this.active.view = this.isActive('/view');
        this.active.information = this.isActive('/health');
        this.active.bookmarks = this.isActive('/bookmarks');
        this.active.settings =
            this.systemId &&
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
        if (this.singleSystem || this.environment.isLocal) {
            // Special case for a single system - it always active
            this.headerService.activeSystem = this.systems[0];
        } else if (this.systemId) {
            // Will only have multiple systems on cloud
            this.headerService.activeSystem = (this.systems as NxSystemInfo[]).find(system => {
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
                        this.headerService.activeSystem.id,
                    );

                    this.system
                        .getInfoAndPermissions(false)
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
        return (
            this.navVisible &&
            this.headerService.activeSystem &&
            !this.active.integrations &&
            !this.active.ipvd
        );
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

        return this.CONFIG.featureFlags.dashboardRedirect || this.cookieService.get('devServer')
            ? '/dashboard'
            : '/';
    }

    get mainNode() {
        return (
            this.headerService.currentLocation.parentNode?.breadcrumbs?.[0] ||
            this.headerService.currentLocation.parentNode
        );
    }
}
