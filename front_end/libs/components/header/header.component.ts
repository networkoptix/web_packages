import { CommonModule } from '@angular/common';
import {
    Component,
    DestroyRef,
    effect,
    inject,
    isDevMode,
    OnInit,
    Renderer2,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    ActivatedRoute,
    NavigationEnd,
    Router,
    Event as RouterEvent,
    RouterModule,
    RoutesRecognized,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { sum } from 'lodash-es';
import { CookieService } from 'ngx-cookie-service';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import { BehaviorSubject, combineLatest, firstValueFrom, fromEvent } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { accountSelectors } from '@common/store/account';
import { NxAccountSettingsDropdown } from '@components/dropdowns/account-settings/account-settings.component';
import { LanguageModule } from '@components/dropdowns/language/language.module';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxLoginService } from '@services/login.service';
import { NxMenusService } from '@services/menus.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { OrgRoleIds } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSessionService } from '@services/session.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import { icons } from '@static-variables';
import { GridBreakpoints } from '@styles/theme-variables-common';
import { useNewCloud } from '@utils/general';

import { NxHeaderMainButtonComponent } from './main-button/main-button.component';
import { NxNavDropdownComponent } from './nav-dropdown/nav-dropdown.component';
import { NxTabsComponent } from './tabs/tabs.component';

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

@Component({
    selector: 'nx-header',
    templateUrl: 'header.component.html',
    styleUrls: [
        environment.isWebadmin ? 'header-webadmin.component.scss' : 'header.component.scss',
    ],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        AngularSvgIconModule,
        NxAccountSettingsDropdown,
        LanguageModule,
        NxHeaderMainButtonComponent,
        NxNavDropdownComponent,
        NxTabsComponent,
        NxResizeObserver,
        NxClickElsewhereDirective,
        NxAddSvgSrcDirective,
    ],
})
export class NxHeaderComponent implements OnInit {
    CONFIG = nxConfig;
    readonly environment = environment;
    LANG = staticLang;
    destroyRef = inject(DestroyRef);

    userEmail: string;
    canSeeInfo: boolean;
    system: NxSystem;
    systems: NxSystemInfo[];
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
        translateService: TranslateService,
        private renderer: Renderer2,
        public appState: NxAppStateService,
        private route: ActivatedRoute,
        private systemsService: NxSystemsService,
        private systemService: NxSystemService,
        private accountService: NxAccountService,
        private storageService: LocalStorageService,
        private sessionService: NxSessionService,
        private router: Router,
        private store: Store,
        public headerService: NxHeaderService,
        public menusService: NxMenusService,
        private sessionStorage: SessionStorageService,
        private cookieService: CookieService,
        public loginService: NxLoginService,
        private channelPartnersService: NxChannelPartnersService,
    ) {
        translateService.onTranslationChange.pipe(takeUntilDestroyed()).subscribe(() => {
            setTimeout(() => {
                this.getMenu();
            });
        });

        if (nxConfig.featureFlags.newHeader) {
            this.lazyLoadNewHeader();
        }
        setTimeout(() => {
            this.getMenu();
        });

        if (environment.isWebadmin) {
            // Polls for the system and currentUser. Once its ready the header is updated and the poll is killed off.
            effect(
                () => {
                    const system = this.systemService.currentSystem$$();
                    if (system?.permissionManager?.currentUser$$()) {
                        this.getMenu();
                        this.menusService.updateActiveSystemMenu(system);
                    }
                },
                { allowSignalWrites: true },
            );

            effect(() => {
                const isAuthorized = this.sessionService.isAuthorized$$();
                if (isAuthorized) {
                    this.getAccountLocal();
                }
            });
        }
        // Updates windowWidth$ behavior subject on window resize
        fromEvent<Event>(window, 'resize')
            .pipe(
                takeUntilDestroyed(),
                map(event => (event.target as unknown as Window).innerWidth),
                startWith(window.innerWidth),
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
                takeUntilDestroyed(),
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

        // Updates the system name in the header when it is changed in settings
        this.systemsService.systemsSubject.pipe(takeUntilDestroyed()).subscribe(systems => {
            if (this.headerService.activeSystem$.getValue()) {
                const updatedSystem = systems.find(
                    system => system.id === this.headerService.activeSystem$.getValue().id,
                );
                if (updatedSystem) {
                    const activeSystem = this.headerService.activeSystem$.getValue();
                    activeSystem.info.name = updatedSystem.name;
                    this.headerService.activeSystem$.next(activeSystem);
                }
            }
        });

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
                const collapsedSize: sizes = this.environment.isWebadmin ? sizes.XL : sizes.MD;
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

        if (isDevMode()) {
            this.headerService.authorizeUrl = useNewCloud()
                ? `/?redirect_url=${window.location.href}`
                : `https://${environment.cloudHost}/authorize?redirect_url=${window.location.href}`;
        }
        this.headerService.createUrl = `${this.headerService.authorizeUrl}${
            !isDevMode() ? '?' : '&'
        }client_type=create`;

        NxConfigService.configChanged.subscribe(() => {
            this.logoSrc = `/static/images/${this.CONFIG.isDarkTheme ? 'dark_' : ''}logo.png`;
        });
    }

    private getMenu(): void {
        this.menusService
            .getMenu(nxConfig.featureFlags.newHeader ? 'new header' : 'header', true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(async header => {
                const nodes = this.menusService.cleanEmptyNodes(header.nodes);
                if (environment.isWebadmin) {
                    const permissions = this.systemService
                        .currentSystem$$()
                        ?.permissionManager.permissions$$();
                    if (!permissions?.generateEvents) {
                        const forDevsIndex = nodes?.findIndex(
                            ({ name }) => name === 'For Developers',
                        );
                        if (forDevsIndex !== -1) {
                            const eventGeneratorIndex = nodes[forDevsIndex].nodes.findIndex(
                                ({ name }) => name === 'Generic Events Generator',
                            );
                            if (eventGeneratorIndex !== -1) {
                                nodes[forDevsIndex].nodes.splice(eventGeneratorIndex, 1);
                            }
                        }
                    }
                }

                if (nxConfig.featureFlags.newHeader) {
                    if (!this.loginState) {
                        nodes.unshift(this.menusService.makeWelcomeNode());
                    } else {
                        if (
                            this.accountService.account.is_authenticated &&
                            nxConfig.featureFlags.channelPartners &&
                            nxConfig.featureFlags.channelPartnersReportsUI
                        ) {
                            try {
                                const cpStructure = await firstValueFrom(
                                    this.channelPartnersService.getChannelStructure(),
                                );
                                // Display "Reports" tab if user has at least 1 CP or 1 Org where they are Org Admin
                                let displayReportsTab = !!cpStructure.channelPartners.length;

                                if (!displayReportsTab && cpStructure.organizations.length) {
                                    const orgs = await firstValueFrom(
                                        this.channelPartnersService.getOrganizations(),
                                    );
                                    displayReportsTab = orgs.some(org =>
                                        org.ownRolesIds.includes(OrgRoleIds.OrgAdmin),
                                    );
                                }

                                if (displayReportsTab) {
                                    nodes.unshift(this.menusService.makeReportsMenuNode());
                                }
                            } catch (e) {
                                console.error('Failed to load channel partner structure');
                            }
                        }
                        nodes.unshift(this.menusService.makeSystemMenuNode());
                        nodes.push(this.menusService.makeAccountSettingsNode());
                    }
                }
                this.headerService.nodes = nodes;

                this.headerService.setLocation(this.router.url);
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
        await import('./new-header/new-header.component').then(m => m.NxNewHeaderComponent);
        const { NxNewHeaderComponent } = await import('./new-header/new-header.component');
        if (this.newHeaderRef) {
            const compRef = this.newHeaderRef.createComponent(NxNewHeaderComponent);
            compRef.instance.width = this.windowWidth$;
        }
    }

    updateBreadcrumbSizes = wrapper =>
        this.breadcrumbWidth$.next(
            Array.from(wrapper.children).map(
                (element: HTMLElement) =>
                    parseInt(window.getComputedStyle(element).getPropertyValue('margin-right')) +
                    element.offsetWidth,
            ),
        );

    ngOnInit(): void {
        this.sessionStorage
            .observe('theme')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                // wait CONFIG to update
                setTimeout(() => {
                    this.logoSrc = `/static/images/${
                        this.CONFIG.isDarkTheme ? 'dark_' : ''
                    }logo.png`;
                });
            });

        this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            this.inline = params.inline !== 'undefined';
        });

        this.navVisible = false;
        this.dropdownsVisible = false;
        this.viewHeader = this.showHeaderAndFooter;
        this.active = {};

        this.appState.headerVisibleSubject
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(visible => {
                this.viewHeader = visible || NxBootstrapProvider.isNewSystem;
            });

        this.router.events
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((event: RouterEvent) => {
                if (event instanceof RoutesRecognized) {
                    this.systemId = event.state.root.firstChild?.params.systemId || '';
                    this.storageService.store('systemId', this.systemId);
                    this.updateActiveSystem();
                    this.updateActive();
                }

                if (this.userEmail && event instanceof NavigationEnd) {
                    // You only receive NavigationEnd events
                    if (this.systemId && !this.systems) {
                        firstValueFrom(this.systemsService.forceUpdateSystems()).then(() => {
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

        this.store
            .select(accountSelectors.selectCurrentUserName)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(email => {
                if (email) {
                    this.userEmail = email;
                    this.dropdownsVisible = true;
                    this.loginState = true;
                    this.renderer.removeClass(document.body, 'anonymous');
                    this.renderer.addClass(document.body, 'authorized');
                    if (nxConfig.featureFlags.newHeader) {
                        const welcomeLang = this.LANG.appHeader.headerMenuNodes.welcome;
                        const systemLang = this.LANG.appHeader.headerMenuNodes.system;
                        const headerName = this.headerService?.nodes[0]?.name;
                        if (
                            this.headerService.nodes.length &&
                            headerName !== systemLang.displayName
                        ) {
                            if (headerName === welcomeLang.displayName) {
                                this.headerService.nodes.shift();
                            }
                            const systemNode = this.menusService.makeSystemMenuNode();
                            const accountNode = this.menusService.makeAccountSettingsNode();
                            this.headerService.nodes.unshift(systemNode);
                            this.headerService.nodes.push(accountNode);
                        }
                    }
                } else {
                    this.loginState = false;
                    this.renderer.removeClass(document.body, 'authorized');
                    this.renderer.addClass(document.body, 'anonymous');
                }
                setTimeout(() => this.renderer.removeClass(document.body, 'loading'));
            });

        if (this.environment.isWebadmin) {
            this.hideWebAdmin = true;
        } else {
            this.systemsService.systemsSubject
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(systems => {
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

    getAccountLocal(): void {
        if (NxBootstrapProvider.isNewSystem) {
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
                this.system.infoSubject
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(system => {
                        this.systems = [system as any]; // TODO: Not sure what is happening with this type, either this.systems should not be assigned to the value that comes out of infoSubject or the NxSystemOldModule type should be updated
                        this.updateActiveSystem();
                        this.updateActive();
                    });
            });
        });
    }

    logout(): void {
        this.accountService.logout();
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
        const sessionVerified =
            this.accountService.account?.sessionVerified || environment.isWebadmin;
        let nextActiveSystem: NxSystemInfo;
        if (this.singleSystem || this.environment.isWebadmin) {
            // Special case for a single system - it always active
            nextActiveSystem = this.systems[0];
        } else if (this.systemId) {
            // Will only have multiple systems on cloud
            nextActiveSystem = this.systems.find(system => {
                return this.systemId === system.id;
            });
        }
        const system = this.systemService.getCurrentSystem();
        this.headerService.activeSystem =
            nextActiveSystem?.system2faEnabled && !sessionVerified ? undefined : system;

        if (!this.environment.isWebadmin) {
            if (system) {
                if (!this.system || this.system.id !== this.systemId) {
                    this.stopActiveSubscription();
                    this.system = this.systemService.createSystem(
                        this.userEmail,
                        system.id,
                        '',
                        true,
                    );

                    this.system
                        .getInfoAndPermissions(false)
                        .then(system => {
                            this.canSeeInfo = system?.permissionManager.isAdmin$$() || false;
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
        if (this.environment.isWebadmin) {
            return '/view';
        }

        if (!this.userEmail) {
            return '/';
        }

        if (this.singleSystem && this.headerService.activeSystem?.id) {
            return `/systems/${this.headerService.activeSystem.id}/view`;
        }

        return nxConfig.featureFlags.dashboardRedirect || this.cookieService.get('devServer')
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
