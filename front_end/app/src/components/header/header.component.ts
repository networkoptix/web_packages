import {
    Component, OnDestroy,
    OnInit, Renderer2, ViewEncapsulation, Inject
}                                    from '@angular/core';
import {
    ActivatedRoute, NavigationEnd,
    Event, Router, RoutesRecognized
}                                    from '@angular/router';
import { LocalStorageService }       from 'ngx-store';
import {
    Subscription, timer, BehaviorSubject, combineLatest, fromEvent, Subject
}                                    from 'rxjs';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxAppStateService }         from '../../services/nx-app-state.service';
import { NxAccountService }          from '../../services/account.service';
import { NxSessionService }          from '../../services/session.service';
import { NxSystemsService }          from '../../services/systems.service';
import { NxHeaderService }           from '../../services/nx-header.service';
import { NxSystem, NxSystemService } from '../../services/system.service';
import { NxMenusService }            from '../../services/menus.service';
import { map, startWith, takeUntil } from 'rxjs/operators';
import { WINDOW }                    from '../../services/window-provider';
import { environment }               from '../../../environments/environment';

class CombinedWidths {
    constructor(
        public totalWidths: number = 0,
        public icon: number = 0,
        public mainButton: number = 0,
        public tabs: number = 0,
        public rightNav: number = 0,
        public windowWidth: number = 0
    ) {}
}

@Component({
    selector    : 'nx-header',
    templateUrl : 'header.component.html',
    styleUrls   : [environment.isLocal ? 'header-webadmin.component.scss' : 'header.component.scss']
})
export class NxHeaderComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    user: any = {};
    canSeeInfo: boolean;
    system: NxSystem;
    systems;
    systemId;
    active: any = {};
    singleSystem: any = {};
    inline;
    navVisible: boolean;
    dropdownsVisible: boolean;
    viewHeader: boolean;
    systemCounter: number;
    loginState;
    unsub$ = new Subject();

    showIcon$ = new BehaviorSubject(true);
    showSmallRightNav$ = new BehaviorSubject(false);
    showTabs$ = new BehaviorSubject(true);
    hideTabsAndDropdown$ = new BehaviorSubject(false);

    menuTabsCollapsed$ = new BehaviorSubject(0);
    iconWidth$ = new BehaviorSubject(0);
    mainButtonWidth$ = new BehaviorSubject(0);
    rightNavWidth$ = new BehaviorSubject(0);
    rightNavWidthCollapsed$ = new BehaviorSubject(0);
    tabsWidth$ = new BehaviorSubject(0);
    windowWidth$ = new BehaviorSubject(0);
    combinedWidths$ = new BehaviorSubject(new CombinedWidths());

    getUrlSystemId;
    untilHaveID;
    private headerSubscription: Subscription;
    private loginSubscription: Subscription;
    private routerSubscription: Subscription;
    private systemSubscription: Subscription;
    private systemIdSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private renderer: Renderer2,
        private appState: NxAppStateService,
        private route: ActivatedRoute,
        private systemsService: NxSystemsService,
        private systemService: NxSystemService,
        private dialogs: NxDialogsService,
        private accountService: NxAccountService,
        private sessionService: NxSessionService,
        private localStorage: LocalStorageService,
        private router: Router,
        public headerService: NxHeaderService,
        private menusService: NxMenusService,
        @Inject(WINDOW) window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.menusService.getMenu('Header', true).pipe(takeUntil(this.unsub$)).subscribe(header => {
            this.headerService.nodes = header;
        });
        fromEvent(window, 'resize').pipe(
            takeUntil(this.unsub$),
            map((event: any) => event.target.innerWidth as number),
            startWith(window.innerWidth)
        ).subscribe(width => this.windowWidth$.next(width));
        combineLatest(this.iconWidth$, this.mainButtonWidth$, this.tabsWidth$, this.rightNavWidth$, this.windowWidth$).pipe(
            takeUntil(this.unsub$),
            map(([icon, mainButton, tabs, rightNav, windowWidth]) => ({
                totalWidths: icon + mainButton + tabs + rightNav,
                icon,
                mainButton,
                tabs,
                rightNav,
                windowWidth
            }))
        ).subscribe(combinedWidths => this.combinedWidths$.next(combinedWidths));
        this.combinedWidths$.subscribe(({
            totalWidths,
            icon,
            mainButton,
            tabs,
            rightNav,
            windowWidth
        }) => {
            const padding = 24;
            const nodes = !!headerService.currentLocation.parentNode?.nodes;
            let navWidth = totalWidths + padding;
            let showIcon = true;
            let showSmallRightNav = false;
            let showTabs = true;
            let hideTabsAndDropdown = false;

            if (!nodes) {
                navWidth = navWidth - tabs;
            }

            if (navWidth > windowWidth) {
                showSmallRightNav = true;
                const collapsedSize = this.CONFIG.isLocal ? 96 : 48;
                const widthDifference = rightNav - this.rightNavWidthCollapsed$.value;
                navWidth = navWidth - widthDifference + collapsedSize;
            }

            if (navWidth > windowWidth) {
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

            if ((navWidth + rightNav - this.rightNavWidthCollapsed$.value) < windowWidth) {
                showSmallRightNav = false;
            }

            this.showIcon$.next(showIcon);
            this.showSmallRightNav$.next(showSmallRightNav);
            this.showTabs$.next(showTabs);
            this.hideTabsAndDropdown$.next(hideTabsAndDropdown);
        });
    }

    private isActive(val) {
        return this.router.url.indexOf(val) >= 0;
    }

    private systemIdUpdate(id) {
        this.systemId = id;
        this.localStorage.set('systemId', this.systemId);

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
    }

    private startTimerSystemIdUpdate() {
        this.untilHaveID = timer(200, 200);
        this.getUrlSystemId = this.untilHaveID.pipe(takeUntil(this.unsub$)).subscribe(() => {
            if (this.router.url.indexOf('/systems/') === 0) {
                const uriSystemId = this.router.url.split('/')[2];

                if (uriSystemId === this.systemId) {
                    this.getUrlSystemId.unsubscribe();
                    return;
                }

                this.systemIdUpdate(uriSystemId);
            }
        });
    }

    private stopActiveSubscription() {
        if (this.system) {
            this.system.stopPoll();
            this.system = undefined;
        }
    }

    ngOnDestroy() {
        this.unsub$.next('done');
    }

    ngOnInit() {
        this.route.queryParams.pipe(takeUntil(this.unsub$)).subscribe(params => {
            this.inline = params.inline !== 'undefined';
        });

        // TODO: (Only for display purpose) Temporary solution until we move View to A8
        // View is still under AJS and it doesn't trigger route change
        this.startTimerSystemIdUpdate(); // ensure update on page reload

        // notification from view.js
        this.systemIdSubscription = this.headerService.systemIdSubject.pipe(takeUntil(this.unsub$)).subscribe((systemId) => {
            if (systemId) {
                this.systemIdUpdate(systemId);
            }
        });
        // TODO: END

        // TODO: experiment iFrame
        // this.headerService.visibilitySubject.subscribe((state) => {
        //     if (state !== undefined) {
        //         this.viewHeader = state;
        //     }
        // });

        this.navVisible = false;
        this.dropdownsVisible = false;
        this.viewHeader = this.CONFIG.showHeaderAndFooter;
        this.active = {};

        this.headerSubscription = this.appState.headerVisibleSubject.subscribe((visible) => {
            this.viewHeader = visible;
        });

        this.routerSubscription = this.router.events
            .pipe(takeUntil(this.unsub$))
            .subscribe((event: Event) => {
                if (event instanceof RoutesRecognized) {
                    this.systemId = event.state.root.firstChild.params.systemId || '';
                    this.localStorage.set('systemId', this.systemId);
                    this.updateActiveSystem();
                    this.updateActive();
                }

                if (event instanceof NavigationEnd) {
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
            .pipe(takeUntil(this.unsub$)).subscribe((loginState: string) => {
                this.accountService
                    .get()
                    .then(account => {
                        this.renderer.removeClass(document.body, 'loading');

                        if (account) {
                            this.dropdownsVisible = true;
                            this.loginState = true;
                            this.renderer.removeClass(document.body, 'anonymous');
                            this.renderer.addClass(document.body, 'authorized');
                            if (!this.CONFIG.isLocal) {
                                this.systemsService.getSystem(account.email);
                                this.systemsService
                                    .forceUpdateSystems(loginState)
                                    .toPromise()
                                    .then(() => this.updateActive());
                            }
                        } else {
                            this.loginState = false;
                            this.renderer.removeClass(document.body, 'authorized');
                            this.renderer.addClass(document.body, 'anonymous');
                        }
                    });
            });

        this.systemSubscription = this.systemsService.systemsSubject.pipe(takeUntil(this.unsub$)).subscribe((systems) => {
            if (!systems) {
                return;
            }

            this.systemId = this.localStorage.get('systemId');

            if (!this.systemId && this.route.firstChild && this.route.firstChild.snapshot.params.systemId) {
                this.systemId = this.route.firstChild.snapshot.params.systemId;
            }
            this.systems = systems;
            this.singleSystem = (this.systems.length === 1);
            this.systemCounter = this.systems.length;

            this.updateActiveSystem();
            this.updateActive();
        });
    }

    onClick(event) {
        if (this.systemId && this.isActive(event.target.id) && !this.isActive('view') && !this.isActive('health')) {
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

    login() {
        const { url } = this.router;
        const redirect = this.CONFIG.redirect.paths.some((path) => {
            return path === '/' ? url === '/' : url.includes(path);
        });
        // Handling promise to satisfy the linter.
        this.dialogs
            .login(!redirect)
            .then(() => {});

        return false;
    }

    logout() {
        this.accountService.logout(true);
    }

    updateActive() {
        this.active.ipvd = this.isActive('/ipvd');
        this.active.integrations = this.isActive('/integrations');
        this.active.register = this.isActive('/register');
        this.active.view = this.isActive('/view');
        this.active.information = this.isActive('/health');
        this.active.settings = this.systemId && this.isActive('/systems') && !this.isActive('/view') && !this.isActive('/health');
        this.navVisible = true;
    }

    updateActiveSystem() {
        if (!this.systems) {
            return;
        }
        if (this.singleSystem) { // Special case for a single system - it always active
            this.headerService.activeSystem = this.systems[0];
        } else if (this.systemId) {
            this.headerService.activeSystem = this.systems.find((system) => {
                return this.systemId === system.id;
            });
        } else {
            this.headerService.activeSystem = undefined;
        }

        this.accountService
            .get()
            .then(account => {
                if (account) {
                    this.user = account;
                    if (this.headerService.activeSystem) {
                        if (!this.system || this.system.id !== this.systemId) {
                            this.stopActiveSubscription();
                            this.system = this.systemService.createSystem(this.user.email, this.headerService.activeSystem.id);

                            this.system.getInfoAndPermissions(false).catch(_ => {
                            }).then(system => {
                                this.systems.find(sys => {
                                    if (sys.id === this.headerService.activeSystem.id) {
                                        sys.moduleInfo = system.moduleInfo;
                                    }
                                });
                                this.canSeeInfo = (this.CONFIG.cloudCapabilities.healthMonitoring || system && system.info.capabilities && system.info.capabilities.vms_metrics) && this.system.canViewInfo();
                            });
                        }
                    } else {
                        this.stopActiveSubscription();
                    }
                }
            });
    }

    canShowNav() {
        return this.navVisible &&
            this.headerService.activeSystem &&
            !this.active.integrations &&
            !this.active.ipvd;
    }

    get mainUrl() {
        if (!this.user.email) {
            return '/';
        } else if (this.singleSystem) {
            return `/systems/${this.headerService.activeSystem.id}/view`;
        } else {
            return '/systems';
        }
    }
}
