import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import {
    BehaviorSubject,
    from,
    combineLatest,
    Observable
} from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';
import { Auth, MenuNode } from '@services/menus.service.types';

import { IConfig, NxConfigService } from './nx-config';
import { MenuStructure, MenusStructure } from './nx-config/base-config';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxSessionService } from './session.service';

@UntilDestroy({ checkProperties: true })
@Injectable({
    providedIn: 'root'
})
export class NxMenusService {
    private menusStructure: MenusStructure;
    private CONFIG: IConfig;
    private LANG: LanguageI18NStaticTypes;
    private languageChanged$ = new BehaviorSubject('');
    public currentSystemNode$ = new BehaviorSubject<MenuNode>(null);

    endpoint: Partial<{
        view: boolean,
        settings: boolean,
        information: boolean,
        bookmarks: boolean,
        monitoring: boolean,
    }> = {};

    constructor(
        public configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private translate: TranslateService,
        private sessionService: NxSessionService,
        private http: HttpClient
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.languageService.translations;
        this.languageService.translateSubject
            .pipe(untilDestroyed(this))
            .subscribe(this.updateMenu);
    }

    updateMenu = (lang) => {
        this.languageChanged$.next('changed');
        this.menusStructure = Object.entries(this.CONFIG.dynamicMenus || {}).reduce(
            (newMenu, [name, { title, description, nodes }]) => {
                newMenu[name] = {
                    title: title,
                    description: description,
                    nodes: nodes.map(this.translateNode(lang))
                };
                return newMenu;
            }, {});
    }

    getMenu = (name: string, withCurrentSystem = false, ignoreCache = false): Observable<MenuStructure> => {
        let menu = { ...this.menusStructure?.[name.toLowerCase()] } as  MenuStructure;
        // Update to also make request if no menu

        if (environment.isLocal) {
            if (menu?.title === undefined) {
                menu = {
                    description: undefined,
                    nodes: [],
                    title: name
                };
            }
        }

        if (withCurrentSystem && this.currentSystemNode$.value) {
            menu.nodes = menu?.nodes?.length
                ? [this.currentSystemNode$.value, ...menu.nodes]
                : [this.currentSystemNode$.value];
        }

        if (environment.isLocal) {
            return from([menu]);
        }

        return combineLatest([this.sessionService.loginStateSubject, this.languageChanged$])
            .pipe(
                switchMap(([login]): Promise<[string, MenuStructure]> | Observable<[string, MenuStructure]> => ignoreCache || !menu
                    ? this.http.get<MenuStructure>(this.CONFIG.apiBase + `/menus/${encodeURI(name)}`).pipe(
                        map((menu): [string, MenuStructure] => [login, menu])
                    )
                    : Promise.resolve([login, menu])
                ),
                map(([login, menu]) => {
                    const filteredMenu = this.filterMenu(
                        menu,
                        login || environment.isLocal ? Auth.LOGGED_IN : Auth.LOGGED_OUT
                    );
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
            nodes.push({
                ...node,
                nodes: [],
                display_name: indented ? '⮑' : node.display_name,
                state,
                indented
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
                indented
            });
        }
        return nodes;
    }, [])

    private translateNode = (lang?, breadcrumbs: MenuNode[] = []) => (node: MenuNode) => {
        if (!node) {
            return;
        }
        // eslint-disable-next-line camelcase
        let display_name = node.display_name || node.name;
        let name = node.name;

        if (lang) {
            let translatedRaw = '';
            if (node.name_raw || node.name) {
                translatedRaw = this.translate.instant(node.name_raw || node.name);
            }
            if (translatedRaw && translatedRaw !== node.name_raw) {
                name = translatedRaw;
                // eslint-disable-next-line camelcase
                display_name = translatedRaw;
            } else {
                // eslint-disable-next-line camelcase
                display_name = this.translate.instant(display_name);
                name = this.translate.instant(node.name);
            }
        }

        const nodes = node.nodes?.map(this.translateNode(lang, [...breadcrumbs, node])) || [];
        return { ...node, display_name, name, nodes, breadcrumbs };
    }

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

        return (!environment.isLocal && systemId) ? url + segment : segment;
    }

    updateActiveSystemMenu(activeSystem, isLocalAdmin?) {
        if (!activeSystem) {
            return;
        }
        let name = activeSystem.info?.systemName || activeSystem.info?.name || activeSystem.systemName || activeSystem.name;
        if (!name) {
            name = (environment.isLocal) ? this.CONFIG.localServerId : activeSystem.moduleInfo?.id;
        }
        const icon = (
            environment.isLocal ||
            activeSystem.isOnline ||
            activeSystem.stateOfHealth === this.CONFIG.system.status.online
        ) ? 'system.svg' : 'system_offline.svg';

        const hasAdminAccess = activeSystem?.accessRole
            ? this.CONFIG.accessRoles.adminAccess.includes(activeSystem.accessRole.toLowerCase())
            : isLocalAdmin || false;

        const viewNode = new MenuNode(
            'View',
            this.getUrl(activeSystem.id, { view: true }),
            this.LANG?.serverTabTitles.View(),
            this.endpoint.view || false
        );
        const settingsNode = new MenuNode(
            'Settings',
            this.getUrl(activeSystem.id, { settings: true }),
            this.LANG?.serverTabTitles.Settings(),
            this.endpoint.settings || false
        );

        const nodes = [viewNode, settingsNode];
        if (hasAdminAccess) {
            const informationNode = new MenuNode(
                'Information',
                this.getUrl(activeSystem.id, { information: true }),
                this.LANG?.serverTabTitles.Information(),
                this.endpoint.information || false
            );
            nodes.push(informationNode);

            const monitoringNode = new MenuNode(
                'Monitoring',
                this.getUrl(activeSystem.id, { monitoring: true }),
                this.LANG?.serverTabTitles.Monitoring(),
                this.endpoint.monitoring || false
            );
            nodes.push(monitoringNode);
        }

        if (this.configService.flagsEnabled('bookmarks')) {
            const bookmarksNode = new MenuNode(
                'Bookmarks',
                this.getUrl(activeSystem.id, { bookmarks: true }),
                this.LANG?.serverTabTitles.Bookmarks(),
                this.endpoint.bookmarks || false
            );
            nodes.push(bookmarksNode);
        }

        const activeSystemMenu = new MenuNode(
            name,
            this.getUrl(activeSystem.id, { settings: true }),
            name,
            false,
            icon,
            nodes,
            Auth.LOGGED_IN
        );

        this.currentSystemNode$.next(activeSystemMenu);
    }
}
