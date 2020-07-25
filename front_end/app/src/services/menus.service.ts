/* eslint-disable camelcase */
import { Inject, Injectable, OnDestroy }  from '@angular/core';
import { TranslateService }               from '@ngx-translate/core';
import { BehaviorSubject, Subject, from } from 'rxjs';
import { takeUntil, map }                 from 'rxjs/operators';

import { WINDOW }                    from './window-provider';
import { MenuNode }                  from '../components/dropdowns/drop-menu/navigation-tile/navigation-tile.component';
import { IConfig, NxConfigService }  from './nx-config';
import { MenuStructure }             from './nx-config/base-config';
import { LanguageI18NStaticTypes }   from '../../language_i18n_static_types';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxSessionService }          from './session.service';

export enum Auth {
    BOTH='Both',
    LOGGED_IN='Logged In',
    LOGGED_OUT='Logged Out'
}

@Injectable({
    providedIn: 'root'
})
export class NxMenusService implements OnDestroy {
    private menusStructure: MenuStructure;
    private CONFIG: IConfig;
    private LANG: LanguageI18NStaticTypes;
    public currentSystemNode$ = new BehaviorSubject<MenuNode>(null);
    private unsub$ = new Subject();

    endpoint: Partial<{ view: boolean, settings: boolean, information: boolean }> = {};

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private translate: TranslateService,
        private sessionService: NxSessionService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        // @ts-ignore
        languageService.translateSubject.pipe(takeUntil(this.unsub$)).subscribe(this.updateMenu);
    }

    ngOnDestroy() {
        this.unsub$.next('done');
    }

    updateMenu = (lang) => {
        this.menusStructure = Object.entries(this.CONFIG.dynamicMenus || {}).reduce(
            (newMenu, [name, nodes]) => {
                newMenu[name] = nodes.map(this.translateNode(lang));
                return newMenu;
            }, {});
    }

    getMenu = (name: string, withCurrentSystem = false) => {
        let menu = this.menusStructure?.[name] ?? [];
        if (withCurrentSystem && this.currentSystemNode$.value) {
            menu = [this.currentSystemNode$.value, ...menu];
        };
        if (this.CONFIG.isLocal) {
            return from([menu]);
        }
        return this.sessionService.loginStateSubject
            .pipe(map(login => this.filterMenu(menu, login || this.CONFIG.isLocal ? Auth.LOGGED_IN : Auth.LOGGED_OUT)));
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

    updateActiveSystemMenu(activeSystem) {
        const { endpoint: { view = false, settings = false, information = false } } = this;
        const name = activeSystem.name || activeSystem.moduleInfo.name;
        const icon = activeSystem.stateOfHealth === this.CONFIG.system.status.online ? 'systems.svg' : 'system_offline.svg';

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

        const informationNode = new MenuNode(
            'Information',
            this.getUrl(activeSystem.id, { information: true })
        );
        informationNode.currentRoute = information;
        const nodes = [viewNode, settingsNode, informationNode];

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
