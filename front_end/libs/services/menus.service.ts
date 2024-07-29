import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { BehaviorSubject, from, combineLatest, Observable, Subject } from 'rxjs';
import { filter, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

import { accountSelectors } from '@common/store/account';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { Auth, MenuNode } from '@services/menus.service.types';
import { CurrentUser } from '@services/system-user.types';
import { NxSystem } from '@services/system.service/system';
import { canViewLayouts } from '@utils/can-view-layouts';

import { apiBase } from '../variables/static-variables';

import { MenuStructure, MenusStructure } from './nx-config/base-config';
import { nxConfig } from './nx-config/config';

@UntilDestroy({ checkProperties: true })
@Injectable({
    providedIn: 'root',
})
export class NxMenusService {
    private menusStructure: MenusStructure;
    public CONFIG = nxConfig;
    private LANG = staticLang;
    private languageChanged$ = new BehaviorSubject('');
    public currentSystemNode$ = new BehaviorSubject<MenuNode>(null);
    public channelPartnerServiceMode$ = new BehaviorSubject(false);
    apiBase: string = apiBase;

    currentUser: CurrentUser;
    activeSystem$ = new Subject<NxSystem>();
    activeSystem$$ = toSignal(this.activeSystem$);
    updateSystem$ = this.activeSystem$
        .pipe(
            filter(Boolean),
            switchMap(system => system.infoSubject),
        )
        .subscribe(() => {
            const activeSystem = this.activeSystem$$();
            this.updateSystemMenu(activeSystem);
        });

    endpoint: Partial<{
        view: boolean;
        settings: boolean;
        information: boolean;
        bookmarks: boolean;
        monitoring: boolean;
        layouts: boolean;
        services: boolean;
    }> = {};

    constructor(
        private translate: TranslateService,
        private store: Store,
        private http: HttpClient,
        private deviceService: DeviceDetectorService,
    ) {
        this.updateMenu();

        translate.onTranslationChange
            .pipe(
                filter(lang => lang !== null),
                map(({ lang }) => lang),
                distinctUntilChanged(),
                untilDestroyed(this),
            )
            .subscribe(() => {
                setTimeout(() => {
                    this.updateMenu();
                });
            });
    }

    updateMenu = (): void => {
        this.languageChanged$.next('changed');
        this.menusStructure = Object.entries(this.CONFIG.dynamicMenus || {}).reduce(
            (newMenu, [name, { title, description, nodes }]) => {
                newMenu[name] = {
                    title,
                    description,
                    nodes: nodes.map(this.translateNode()),
                };
                return newMenu;
            },
            {},
        );
    };

    getMenu = (
        name: string,
        withCurrentSystem = false,
        ignoreCache = false,
    ): Observable<MenuStructure> => {
        let menu =
            name.toLowerCase() in this.menusStructure
                ? ({ ...this.menusStructure?.[name.toLowerCase()] } as MenuStructure)
                : undefined;
        // Update to also make request if no menu

        if (environment.isLocal) {
            if (menu?.title === undefined) {
                menu = {
                    description: undefined,
                    nodes: [],
                    title: name,
                };
            }
        }

        if (
            !environment.isLocal &&
            withCurrentSystem &&
            this.currentSystemNode$.value &&
            !nxConfig.featureFlags.newHeader
        ) {
            menu.nodes = menu?.nodes?.length
                ? [this.currentSystemNode$.value, ...menu.nodes]
                : [this.currentSystemNode$.value];
        }

        if (environment.isLocal) {
            return from([menu]);
        }

        return combineLatest([
            this.store.select(accountSelectors.selectCurrentUserName),
            this.languageChanged$,
        ]).pipe(
            switchMap(
                ([login]):
                    | Promise<[string, MenuStructure]>
                    | Observable<[string, MenuStructure]> =>
                    ignoreCache || !menu
                        ? this.http
                              .get<MenuStructure>(this.apiBase + `/cms/menus/${encodeURI(name)}`)
                              .pipe(map((menu): [string, MenuStructure] => [login, menu]))
                        : Promise.resolve([login, menu]),
            ),
            map(([login, menu]) => {
                const filteredMenu = this.filterMenu(
                    menu,
                    login || environment.isLocal ? Auth.LOGGED_IN : Auth.LOGGED_OUT,
                );
                filteredMenu.nodes = filteredMenu.nodes.map(this.translateNode());
                return filteredMenu;
            }),
        );
    };

    filterMenu = (menu: MenuStructure, auth: Auth) => {
        const checkNodes = (nodes: MenuNode[], node: MenuNode) => {
            if (node.authentication === Auth.BOTH || node.authentication === auth) {
                if (node.nodes) {
                    node.nodes = node.nodes.reduce(checkNodes, []);
                }
                nodes.push(node);
            }
            return nodes;
        };
        menu.nodes = (menu.nodes || []).reduce(checkNodes, []);
        return menu;
    };

    cleanEmptyNodes = (menu: MenuNode[], checkAsset = false) =>
        (menu || []).reduce((menu, node: MenuNode) => {
            const nodes = this.cleanEmptyNodes(node.nodes, checkAsset);
            return nodes.length || (checkAsset && node.asset_id) || node.url
                ? [...menu, { ...node, nodes }]
                : menu;
        }, []);

    addDraftAndPending = <T extends MenuNode>(menu: T[]) =>
        menu.reduce((nodes: T[], node: T) => {
            let indented = false;
            if (node.nodes?.length) {
                node.nodes = this.addDraftAndPending(node.nodes);
            }
            if (node.accepted) {
                nodes.push({ ...node, indented });
                indented = true;
            }
            if (node.pending) {
                const state = 'pending';
                nodes.push({
                    ...node,
                    nodes: [],
                    display_name: indented ? '⮑' : node.display_name,
                    state,
                    indented,
                });
                indented = true;
            }
            if (node.draft) {
                const state = 'draft';
                nodes.push({
                    ...node,
                    nodes: [],
                    display_name: indented ? '⮑' : node.display_name,
                    state,
                    indented,
                });
            }
            return nodes;
        }, []);

    private translateNode =
        (breadcrumbs: MenuNode[] = []) =>
        (node: MenuNode) => {
            if (!node) {
                return;
            }
            let display_name = node.display_name || node.name;
            let name = node.name;
            let translatedRaw = '';
            if (node.name_raw || node.name) {
                translatedRaw = this.translate.instant(node.name_raw || node.name);
            }
            if (translatedRaw && translatedRaw !== node.name_raw) {
                name = translatedRaw;
                display_name = translatedRaw;
            } else {
                display_name = this.translate.instant(display_name);
                name = this.translate.instant(node.name);
            }

            if (node.name === 'Support') {
                const supportUrl = node.url;
                if (supportUrl.includes('@') && !supportUrl.includes('mailto:')) {
                    node.url = `mailto:${supportUrl}`;
                } else if (/\d{3}-\d{3}-\d{4}/g.test(supportUrl) && !supportUrl.includes('tel:')) {
                    node.url = `tel:${supportUrl.replace(/ \(Option (\d*)\)/, ';$1')}`;
                }
            }

            const nodes = node.nodes?.map(this.translateNode([...breadcrumbs, node])) || [];
            return { ...node, display_name, name, nodes, breadcrumbs };
        };

    getUrl(systemId: string, endpoint = this.endpoint, home = false) {
        const url = environment.isLocal ? '/settings' : '/systems/' + systemId;
        if (home) {
            return url;
        }

        let segment = '';
        if (endpoint.view) {
            segment = '/view';
        }

        if (endpoint.information) {
            segment = '/health';
        }

        if (endpoint.bookmarks) {
            segment = '/bookmarks';
        }

        if (endpoint.settings && environment.isLocal) {
            segment = '/settings';
        }

        if (endpoint.monitoring) {
            segment = '/monitoring';
        }

        if (endpoint.layouts) {
            segment = '/layouts';
        }

        if (endpoint.services) {
            segment = '/services';
        }

        return !environment.isLocal && systemId ? url + segment : segment;
    }

    makeReportsMenuNode() {
        const reportsLang = this.LANG.appHeader.headerMenuNodes.reports;
        const reportsNode = new MenuNode(reportsLang.displayName, '/reports');
        reportsNode.nodes.push(new MenuNode('', '/reports'));
        reportsNode.nodes[0].invisible = true;
        reportsNode.nodes.push(new MenuNode(reportsLang.nodes.serviceUsage.displayName, ''));
        reportsNode.nodes.push(new MenuNode(reportsLang.nodes.serviceChanges.displayName, ''));
        return reportsNode;
    }

    makeSystemMenuNode() {
        if (nxConfig.featureFlags.channelPartners) {
            const homeLang = this.LANG.appHeader.headerMenuNodes.channelPartners;
            const homeNode = new MenuNode(homeLang.displayName, '/home');
            homeNode.nodes.push(new MenuNode('', '/home'));
            homeNode.nodes[0].invisible = true;
            return homeNode;
        }
        const systemLang = this.LANG.appHeader.headerMenuNodes.system;
        const systemNode = new MenuNode(systemLang.displayName, '/systems');
        systemNode.nodes.push(new MenuNode(systemLang.nodes[0].displayName, '/systems'));
        return systemNode;
    }

    makeAccountSettingsNode() {
        const accountSettingsLang = this.LANG.appHeader.headerMenuNodes.accountSettings;
        const accountNode = new MenuNode(accountSettingsLang.displayName, '/account');
        accountNode.invisible = true;
        accountNode.nodes.push(new MenuNode(accountSettingsLang.nodes[0].displayName, '/account'));
        return accountNode;
    }

    makeWelcomeNode() {
        const welcomeLang = this.LANG.appHeader.headerMenuNodes.welcome;
        const welcomeNode = new MenuNode(welcomeLang.displayName, '/');
        welcomeNode.nodes.push(new MenuNode(welcomeLang.nodes[0].displayName, '/'));
        return welcomeNode;
    }

    updateActiveSystemMenu(activeSystem): void {
        if (activeSystem) {
            this.channelPartnerServiceMode$.next(false);
            this.activeSystem$.next(activeSystem);
        }
    }
    private updateSystemMenu(activeSystem): void {
        let name =
            activeSystem.info?.systemName ||
            activeSystem.info?.name ||
            activeSystem.systemName ||
            activeSystem.name;
        if (!name) {
            name = environment.isLocal ? this.CONFIG.localServerId : activeSystem.moduleInfo?.id;
        }
        const icon =
            environment.isLocal ||
            activeSystem.isOnline ||
            activeSystem.stateOfHealth === this.CONFIG.system.status.online
                ? 'system.svg'
                : 'system_offline.svg';

        const nodes = [];
        const permissions = activeSystem.permissionManager?.permissions$$() || {};
        if (activeSystem.canViewADevice()) {
            const viewNode = new MenuNode(
                'View',
                this.getUrl(activeSystem.id, { view: true }),
                this.LANG?.serverTabTitles.View,
                this.endpoint.view || false,
            );
            nodes.push(viewNode);
        }

        const settingsNode = new MenuNode(
            'Settings',
            this.getUrl(activeSystem.id, { settings: true }),
            this.LANG?.serverTabTitles.Settings,
            this.endpoint.settings || false,
        );
        nodes.push(settingsNode);

        if (permissions.systemHealth) {
            const informationNode = new MenuNode(
                'Information',
                this.getUrl(activeSystem.id, { information: true }),
                this.LANG?.serverTabTitles.Information,
                this.endpoint.information || false,
            );
            const monitoringNode = new MenuNode(
                'Monitoring',
                this.getUrl(activeSystem.id, { monitoring: true }),
                this.LANG?.serverTabTitles.Monitoring,
                this.endpoint.monitoring || false,
            );
            nodes.push(informationNode, monitoringNode);
        }

        if (
            activeSystem.canViewBookmarks(
                this.deviceService.isMobile() || this.deviceService.isTablet(),
            )
        ) {
            const bookmarksNode = new MenuNode(
                'Bookmarks',
                this.getUrl(activeSystem.id, { bookmarks: true }),
                this.LANG?.serverTabTitles.Bookmarks,
                this.endpoint.bookmarks || false,
            );
            nodes.splice(1, 0, bookmarksNode); // Right after view
        }

        if (activeSystem.canViewADevice() && canViewLayouts(activeSystem)) {
            const layoutsNode = new MenuNode(
                'Layouts',
                this.getUrl(activeSystem.id, { layouts: true }),
                this.LANG?.serverTabTitles.Layouts,
                this.endpoint.layouts || false,
            );
            if (nxConfig.featureFlags.layoutsShowBetaTag) {
                layoutsNode.tag = {
                    type: 'beta',
                    value: 'BETA',
                };
            }
            nodes.splice(1, 0, layoutsNode);
        }

        // Services
        if ('organizationId' in activeSystem.info && permissions.viewServices) {
            const servicesNode = new MenuNode(
                'Services',
                this.getUrl(activeSystem.id, { services: true }),
                this.LANG?.serverTabTitles.Services,
                this.endpoint.services || false,
            );
            nodes.push(servicesNode);
        }

        const activeSystemMenu = new MenuNode(
            name,
            this.getUrl(activeSystem.id, { settings: true }),
            name,
            false,
            icon,
            nodes,
            Auth.LOGGED_IN,
        );

        this.currentSystemNode$.next(activeSystemMenu);
    }

    serviceMode(id: string, name: string): void {
        this.channelPartnerServiceMode$.next(true);
        const activeSystemMenu = new MenuNode(
            name,
            this.getUrl(id, { services: true }),
            name,
            true,
            undefined,
            [
                new MenuNode(
                    'Services',
                    this.getUrl(id, { services: true }),
                    this.LANG?.serverTabTitles.Services,
                    true,
                ),
            ],
            Auth.LOGGED_IN,
            false,
            id,
        );
        this.currentSystemNode$.next(activeSystemMenu);
    }
}
