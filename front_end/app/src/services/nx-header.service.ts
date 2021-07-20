import { Injectable }               from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Router, NavigationStart }  from '@angular/router';

import { environment }              from '../../environments/environment';
import { NxMenusService, MenuNode } from './menus.service';

enum systemRoutes {
    SETTINGS='settings',
    VIEW='view',
    HEALTH='health'
}

type createButtonType = 'default' | 'primary'
interface MenuNodeNavProps {
    url: string;
    // eslint-disable-next-line camelcase
    new_window: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class NxHeaderService {
    public showSubject = new BehaviorSubject(false);
    public activeSystem$ = new BehaviorSubject(null);
    public lastActive$ = new BehaviorSubject(null);
    private unsub$ = new Subject();
    public nodes: MenuNode[] = [];
    public currentLocation$ = new BehaviorSubject<any>({})
    public createAccountButtonType$ = new BehaviorSubject<createButtonType>('primary')

    set currentLocation(value) {
        this.currentLocation$.next(value);
    }

    get currentLocation() {
        return this.currentLocation$.value;
    }

    set createAccountButtonType(value: createButtonType) {
        this.createAccountButtonType$.next(value);
    }

    get createAccountButtonType() {
        return this.createAccountButtonType$.value;
    }

    // Only to communicate with AJS
    systemIdSubject = new BehaviorSubject<string>(undefined);

    constructor(
        private router: Router,
        private menusService: NxMenusService
    ) {
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
        const settingsBase = environment.isLocal ? '/settings' : '/systems';
        if (url.startsWith(settingsBase) ||
            (environment.isLocal && (
                url.startsWith('/view') ||
                url.startsWith('/health')
            ))
        ) {
            bestMatch.isSystem = true;
            bestMatch.parentNode = this.menusService.currentSystemNode$.value;
            const systemId = environment.isLocal ? '' : this.activeSystem$.value?.id;
            const systemUrl = `${settingsBase}${environment.isLocal ? '' : '/'}${systemId}`;
            const viewUrl = environment.isLocal ? '/view' : systemUrl + '/view';
            const healthUrl = environment.isLocal ? '/health' : systemUrl + '/health';
            if (url.startsWith(viewUrl)) {
                this.menusService.endpoint = { view: true };
                bestMatch.path = viewUrl;
            } else if (url.startsWith(healthUrl)) {
                this.menusService.endpoint = { information: true };
                bestMatch.path = healthUrl;
            } else if (url.startsWith(systemUrl)) {
                this.menusService.endpoint = { settings: true };
                bestMatch.path = systemUrl;
            } else {
                bestMatch.parentNode = undefined;
                bestMatch.path = settingsBase;
            }
        } else {
            bestMatch.isSystem = false;

            const recursivelyFindMatch = this.findMatchFactory(url, bestMatch);
            recursivelyFindMatch(this.nodes);
        }
        this.currentLocation = bestMatch;
    }

    findMatchFactory(url: any, target: Record<any, any> = {}) {
        return (startingNodes) => {
            const nodes = [...startingNodes];
            for (let i = 0; i < nodes.length; i++) {
                const parentNode = nodes[i];
                for (let j = 0; j < nodes[i].nodes.length; j++) {
                    const node = parentNode.nodes[j];
                    nodes.push(node);
                    if (node.url) {
                        const nodeUrl = node.url.startsWith('/') ? node.url : `/${node.url}`;
                        if (nodeUrl === url || url.startsWith(nodeUrl) && (!target.path || target.path.length < nodeUrl.length)) {
                            target.path = node.url;
                            target.assetId = node.asset_id;
                            target.parentNode = parentNode;
                            target.childNode = node;
                            target.breadcrumbs = node.breadcrumbs;
                            if (nodeUrl === url) {
                                break;
                            }
                        }
                    }
                }
            }

            return target;
        };
    }

    /**
     * Check if url is an external link then handles navigation appropriately.
     *
     * @param param0 - Accepts MenuNode which contains a url property
     */
    handleNav({ url, new_window: newWindow }: MenuNodeNavProps, event) {
        const openNewWindow = newWindow || event?.metaKey || event?.ctrlKey;
        this.showSubject.next(false);
        const urlPattern = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=\+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w\-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\\w]*))?)/;
        if (urlPattern.test(url)) {
            if (!url.startsWith('http')) {
                url = `http://${url}`;
            }
            window.open(url, openNewWindow ? '_blank' : '_self');
        } else if (openNewWindow) {
            const serializedUrl = this.router.serializeUrl(this.router.createUrlTree([url]));
            window.open(serializedUrl, '_blank');
        } else {
            this.router.navigate([url])
                .catch((ex) => {
                    console.error(ex);
                });
        }
    }
}
