/* eslint-disable camelcase */
import { Inject, Injectable, OnDestroy }  from '@angular/core';
import { TranslateService }               from '@ngx-translate/core';
import {
    BehaviorSubject, Subject, from, combineLatest
}                                         from 'rxjs';
import { takeUntil, map }                 from 'rxjs/operators';

import { WINDOW }                    from './window-provider';
import { IConfig, NxConfigService }  from './nx-config';
import { MenuStructure }             from './nx-config/base-config';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxSessionService }          from './session.service';

export enum Auth {
    BOTH='Both',
    LOGGED_IN='Logged In',
    LOGGED_OUT='Logged Out'
}

export class MenuNode {
    public icon?: string;
    public currentRoute?: boolean;

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
        public next_item = false
    ) {
        this.icon = icon;
        this.currentRoute = currentRoute;
    }
}

@Injectable({
    providedIn: 'root'
})
export class NxMenusService implements OnDestroy {
    private menusStructure: MenuStructure;
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
        @Inject(WINDOW) private window: Window
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
            (newMenu, [name, nodes]) => {
                newMenu[name] = nodes.map(this.translateNode(lang));
                return newMenu;
            }, {});
    }

    getMenu = (name: string, withCurrentSystem = false) => {
        let menu = this.menusStructure?.[name.toLowerCase()] ?? [];
        if (withCurrentSystem && this.currentSystemNode$.value) {
            menu = [this.currentSystemNode$.value, ...menu];
        };
        if (this.CONFIG.isLocal) {
            return from([menu]);
        }
        return combineLatest([this.sessionService.loginStateSubject, this.languageChanged$])
            .pipe(map(([login]) => this.filterMenu(menu, login || this.CONFIG.isLocal ? Auth.LOGGED_IN : Auth.LOGGED_OUT)));
    }

    filterMenu = (menu: MenuNode[], auth: Auth) => {
        const checkNodes = (nodes: MenuNode[], node: MenuNode) => {
            if (node.authentication === Auth.BOTH || node.authentication === auth) {
                if (node.nodes) {
                    node.nodes = node.nodes.reduce(checkNodes, []);
                }
                nodes.push(node);
            }
            return nodes;
        };
        return menu.reduce(checkNodes, []);
    }

    private translateNode = (lang) => (node: MenuNode) => {
        if (!node) {
            return;
        }
        const display_name = this.translate.instant(node.display_name || node.name);
        const name = this.translate.instant(node.name);
        const nodes = node.nodes?.map(this.translateNode(lang)) || [];
        return { ...node, display_name, name, nodes };
    }

    getUrl(systemId: string, endpoint = this.endpoint) {
        let url = this.CONFIG.isLocal ? '/settings' : '/systems/' + systemId;
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
        const name = activeSystem.name || activeSystem.moduleInfo.name;
        const icon = activeSystem.stateOfHealth === this.CONFIG.system.status.online ? 'systems.svg' : 'system_offline.svg';
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
            '',
            icon,
            nodes,
            Auth.LOGGED_IN,
            name
        );

        this.currentSystemNode$.next(activeSystemMenu);
    }
}
