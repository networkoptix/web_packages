import { Injectable }               from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Router, NavigationStart }  from '@angular/router';

import { MenuNode }                 from '../components/dropdowns/drop-menu/navigation-tile/navigation-tile.component';
import { NxConfigService, IConfig } from './nx-config';
import { NxMenusService }           from './menus.service';

@Injectable({
    providedIn: 'root'
})
export class NxHeaderService {
    private CONFIG: IConfig;
    public showSubject = new BehaviorSubject(false);
    public activeSystem$ = new BehaviorSubject(null);
    public lastActive$ = new BehaviorSubject(null);
    private unsub$ = new Subject();
    public nodes: MenuNode[] = [];
    public currentLocation$ = new BehaviorSubject<any>({})

    set currentLocation(value) {
        this.currentLocation$.next(value);
    }

    get currentLocation() {
        return this.currentLocation$.value;
    }

    // Only to communicate with AJS
    systemIdSubject = new BehaviorSubject<string>(undefined);

    constructor(
        configService: NxConfigService,
        private router: Router,
        private menusService: NxMenusService
    ) {
        this.CONFIG = configService.getConfig();
        this.router.events.subscribe(event => {
            if (event instanceof NavigationStart) {
                this.setLocation(event.url);
            }
        });

        this.menusService.currentSystemNode$.subscribe(_ => {
            this.setLocation(this.router.url);
        });
    }

    ngOnDestroy() {
        this.unsub$.next('done');
    }

    get show$() {
        return this.showSubject.getValue();
    }

    set show$(state) {
        this.showSubject.next(state);
    }

    get activeSystem() {
        return this.activeSystem$.value;
    }

    set activeSystem(system) {
        if (system) {
            this.lastActive$.next(system);
        }
        this.activeSystem$.next(system);
        this.setLocation(this.router.url);
    }

    setLocation(url?) {
        const bestMatch: any = {};
        // Check if system url or go through nodes
        const settingsBase = this.CONFIG.isLocal ? '/settings' : '/systems';
        if (url.startsWith(settingsBase) ||
            (this.CONFIG.isLocal && (
                url.startsWith('/view') ||
                url.startsWith('/health')
            ))
        ) {
            bestMatch.isSystem = true;
            bestMatch.parentNode = this.menusService.currentSystemNode$.value;
            const systemId = this.CONFIG.isLocal ? '' : this.activeSystem$.value?.id;
            const systemUrl = `${settingsBase}${this.CONFIG.isLocal ? '' : '/'}${systemId}`;
            const viewUrl = this.CONFIG.isLocal ? '/view' : systemUrl + '/view';
            const healthUrl = this.CONFIG.isLocal ? '/health' : systemUrl + '/health';
            if (url.startsWith(viewUrl)) {
                bestMatch.path = viewUrl;
            } else if (url.startsWith(healthUrl)) {
                bestMatch.path = healthUrl;
            } else if (url.startsWith(systemUrl)) {
                bestMatch.path = systemUrl;
            } else {
                bestMatch.parentNode = undefined;
                bestMatch.path = settingsBase;
            }
        } else {
            bestMatch.isSystem = false;
            for (let i = 0; i < this.nodes.length; i++) {
                const parentNode = this.nodes[i];
                for (let j = 0; j < this.nodes[i].nodes.length; j++) {
                    const node = parentNode.nodes[j];
                    if (node.url) {
                        const nodeUrl = node.url.startsWith('/') ? node.url : `/${node.url}`;
                        if (nodeUrl === url || url.startsWith(nodeUrl) && (!bestMatch.path || bestMatch.path.length < nodeUrl.length)) {
                            bestMatch.path = node.url;
                            bestMatch.parentNode = parentNode;
                            bestMatch.childNode = node;
                            if (nodeUrl === url) {
                                break;
                            }
                        }
                    }
                }
            }
        }
        this.currentLocation = bestMatch;
    }
}
