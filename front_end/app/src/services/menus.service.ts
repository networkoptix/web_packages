/* eslint-disable camelcase */
import { Inject, Injectable, OnDestroy }  from '@angular/core';
import { TranslateService }               from '@ngx-translate/core';
import {
    BehaviorSubject, Subject, from, combineLatest, Observable
}                                         from 'rxjs';
import {
    takeUntil, map, switchMap, startWith
}                                         from 'rxjs/operators';

import { IConfig, NxConfigService }  from './nx-config';
import { MenuStructure, MenusStructure }             from './nx-config/base-config';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxSessionService }          from './session.service';
import { NxCloudApiService }         from './nx-cloud-api';

export enum Auth {
    BOTH='Both',
    LOGGED_IN='Logged In',
    LOGGED_OUT='Logged Out'
}

export class MenuNode {
    public icon?: string;
    public currentRoute?: boolean;
    public accepted?: boolean
    public draft?: boolean;
    public pending?: boolean;
    public indented?: boolean;
    public state?: 'pending' | 'draft'
    public breadcrumbs: MenuNode[];

    constructor(
        public name = '',
        public url: string,
        icon = '',
        public nodes?: MenuNode[],
        public authentication: Auth = Auth.BOTH,
        public display_name = name,
        public new_window = false,
        currentRoute = false,
        public asset_id = null,
        public related_asset_ids = [],
        public next_item = false,
        public urlified = '',
        public subtitle = '',
    ) {
        this.icon = icon;
        this.currentRoute = currentRoute;
    }
}

@Injectable({
    providedIn: 'root'
})
export class NxMenusService implements OnDestroy {
    private menusStructure: MenusStructure;
    private CONFIG: IConfig;
    private LANG: LanguageI18NStaticTypes;
    private languageChanged$ = new BehaviorSubject('')
    public currentSystemNode$ = new BehaviorSubject<MenuNode>(null);
    private unsub$ = new Subject();

    endpoint: Partial<{ view: boolean, settings: boolean, information: boolean }> = {};

    constructor(
        configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private translate: TranslateService,
        private sessionService: NxSessionService,
        private cloudApi: NxCloudApiService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.languageService.translations;
        // @ts-ignore
        this.languageService.translateSubject.pipe(takeUntil(this.unsub$)).subscribe(this.updateMenu);
    }

    ngOnDestroy() {
        this.unsub$.next('done');
    }

    updateMenu = (lang) => {
        this.languageChanged$.next('changed');
        this.menusStructure = Object.entries(this.CONFIG.dynamicMenus || {}).reduce(
            (newMenu, [name, { title, description, nodes }]) => {
                newMenu[name] = {
                    title       : title,
                    description : description,
                    nodes       : nodes.map(this.translateNode(lang))
                };
                return newMenu;
            }, {});
    }

    getMenu = (name: string, withCurrentSystem = false, ignoreCache = false) => {
        let menu = { ...this.menusStructure?.[name.toLowerCase()] } ?? {} as MenuStructure;

        if (this.CONFIG.isLocal) {
            if (menu?.title === undefined) {
                menu = {
                    description : undefined,
                    nodes       : [],
                    title       : name
                };
            }
            if (menu?.title !== 'header') {
                return from([menu]);
            }
        }

        if (withCurrentSystem && this.currentSystemNode$.value) {
            menu.nodes = (menu?.nodes?.length) ? [this.currentSystemNode$.value, ...menu.nodes] : [this.currentSystemNode$.value];
        }

        return combineLatest([this.sessionService.loginStateSubject, this.languageChanged$])
            .pipe(
                switchMap(([login]): Promise<[string, MenuStructure]> | Observable<[string, MenuStructure]> => ignoreCache
                    ? this.cloudApi.getMenu(name).pipe(
                        map((menu): [string, MenuStructure] => [login, menu]),
                        startWith([login, { ...menu, nodes: ignoreCache ? [] : menu.nodes }])
                    )
                    : Promise.resolve([login, menu])
                ),
                map(([login, menu]) => {
                    const filteredMenu = this.filterMenu(menu, login || this.CONFIG.isLocal ? Auth.LOGGED_IN : Auth.LOGGED_OUT);
                    filteredMenu.nodes = filteredMenu.nodes.map(this.translateNode());
                    return filteredMenu;
                })
            ) as Observable<MenuStructure>;
    }

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
    }

    cleanEmptyNodes = (menu: MenuNode[], checkAsset = false) => (menu || []).reduce((menu, node: MenuNode) => {
        const nodes = this.cleanEmptyNodes(node.nodes, checkAsset);
        return nodes.length || (checkAsset && node.asset_id) || node.url ? [...menu, { ...node, nodes }] : menu;
    }, []);

    addDraftAndPending = <T extends MenuNode>(menu: T[]) => menu.reduce((nodes: T[], node: T) => {
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
            nodes.push({ ...node, nodes: [], display_name: indented ? '⮑' : node.display_name, state, indented });
            indented = true;
        }
        if (node.draft) {
            const state = 'draft';
            nodes.push({ ...node, nodes: [], display_name: indented ? '⮑' : node.display_name, state, indented });
        }
        return nodes;
    }, [])

    private translateNode = (lang?, breadcrumbs: MenuNode[] = []) => (node: MenuNode) => {
        if (!node) {
            return;
        }
        const display_name = lang ? this.translate.instant(node.display_name || node.name) : node.display_name || node.name;
        const name = lang ? this.translate.instant(node.name) : node.name;
        const nodes = node.nodes?.map(this.translateNode(lang, [...breadcrumbs, node])) || [];
        return { ...node, display_name, name, nodes, breadcrumbs };
    }

    getUrl(systemId: string, endpoint = this.endpoint, home = false) {
        let url = this.CONFIG.isLocal ? '/settings' : '/systems/' + systemId;
        if (home) {
            return url;
        }

        if (!this.CONFIG.isLocal && systemId) {
            if (endpoint.view) {
                url += '/view';
            }

            if (endpoint.information) {
                url += '/health';
            }
        } else {
            if (endpoint.view) {
                url = '/view';
            }

            if (endpoint.information) {
                url = '/health';
            }
        }
        return url;
    }

    updateActiveSystemMenu(activeSystem, isLocalAdmin?) {
        if (!activeSystem) {
            return;
        }
        const { endpoint: { view = false, settings = false, information = false } } = this;
        // TODO: unify system's name location once we remove promises
        let name = activeSystem.info?.systemName || activeSystem.info?.name || activeSystem.name;
        if (!name) {
            name = (this.CONFIG.isLocal) ? this.CONFIG.localServerId : activeSystem.moduleInfo.id;
        }
        const icon = (activeSystem.isOnline || activeSystem.stateOfHealth === this.CONFIG.system.status.online) ? 'systems.svg' : 'system_offline.svg';
        const hasAdminAccess = activeSystem?.accessRole
            ? this.CONFIG.accessRoles.adminAccess.includes(activeSystem.accessRole.toLowerCase())
            : isLocalAdmin || false;

        const viewNode = new MenuNode(
            'View',
            this.getUrl(activeSystem.id, { view: true })
        );
        viewNode.currentRoute = view;
        const settingsNode = new MenuNode(
            'Settings',
            this.getUrl(activeSystem.id, { settings: true })
        );
        settingsNode.currentRoute = settings;

        const nodes = [viewNode, settingsNode];
        if (hasAdminAccess) {
            const informationNode = new MenuNode(
                'Information',
                this.getUrl(activeSystem.id, { information: true })
            );
            informationNode.currentRoute = information;
            nodes.push(informationNode);
        }

        const activeSystemMenu = new MenuNode(
            name,
            this.getUrl(activeSystem.id, { settings: true }),
            icon,
            nodes,
            Auth.LOGGED_IN,
            name
        );

        this.currentSystemNode$.next(activeSystemMenu);
    }
}
