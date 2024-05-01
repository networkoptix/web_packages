import { Injectable } from '@angular/core';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';

import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxSystem } from '@services/system.service/system';
import { reportsRegex } from '@static-variables';

import { NxMenusService } from './menus.service';
import { MenuNode } from './menus.service.types';
import { ContextManifest } from './nx-cloud-api/nx-cloud-api.types';
import { createButtonType, MenuNodeNavProps } from './nx-header.service.types';
import { windowFactory } from './window-provider';

@UntilDestroy({ checkProperties: true })
@Injectable({
    providedIn: 'root',
})
export class NxHeaderService {
    private window: Window = windowFactory();
    private LANG = staticLang;
    public showSubject = new BehaviorSubject(false);
    public activeSystem$ = new BehaviorSubject<NxSystem>(null);
    public lastActive$ = new BehaviorSubject<NxSystem>(null);
    public nodes$ = new BehaviorSubject<MenuNode[]>([]);
    public currentLocation$ = new BehaviorSubject<any>({});
    public createAccountButtonType$ = new BehaviorSubject<createButtonType>('primary');
    public authorizeUrl = '/authorize';
    public createUrl: string;

    public dynamicRoutes = {};

    get nodes(): MenuNode[] {
        return this.nodes$.getValue();
    }

    set nodes(menunodes: MenuNode[]) {
        this.nodes$.next(menunodes);
    }

    constructor(
        private router: Router,
        private menusService: NxMenusService,
    ) {
        this.router.events.pipe(untilDestroyed(this)).subscribe(event => {
            if (event instanceof NavigationStart) {
                this.setLocation(event.url);
            }

            if (event instanceof NavigationEnd) {
                if (event.url.includes('/reports')) {
                    const regex = new RegExp(reportsRegex);
                    const matches = event.url.match(regex);
                    if (matches) {
                        const entityType = matches[1];
                        const entityID = matches[2];
                        this.dynamicallyUpdateReportsNode(entityType, entityID);
                    }
                }
            }
        });

        this.menusService.currentSystemNode$.pipe(untilDestroyed(this)).subscribe(_ => {
            this.setLocation(this.router.url);
        });
    }

    set currentLocation(value) {
        this.currentLocation$.next(value);
    }

    get currentLocation() {
        return this.currentLocation$.getValue();
    }

    set createAccountButtonType(value: createButtonType) {
        this.createAccountButtonType$.next(value);
    }

    get createAccountButtonType() {
        return this.createAccountButtonType$.getValue();
    }

    get show$() {
        return this.showSubject.getValue();
    }

    set show$(state) {
        this.showSubject.next(state);
    }

    get activeSystem() {
        return this.activeSystem$.getValue();
    }

    set activeSystem(system) {
        if (system) {
            this.lastActive$.next(system);
        }
        this.activeSystem$.next(system);
        this.setLocation(this.router.url);
    }

    get lastActive() {
        return this.lastActive$.getValue();
    }

    getDynamicRoute(url: string) {
        return this.dynamicRoutes[url.split('?')[0]];
    }

    setDynamicRoute(routes: string[], node, url?): void {
        for (const route of routes) {
            this.dynamicRoutes[route] = JSON.parse(JSON.stringify(node));
            this.dynamicRoutes[route].path = route;
        }
        if (url) {
            this.setLocation(url);
        }
    }

    addDynamicDevConsoleNode<Asset extends Record<any, any>>(
        asset: Asset,
        editBaseUrl,
        contexts: ContextManifest[],
        url?,
    ): void {
        const { id, name } = asset;
        const editUrl = `${editBaseUrl}/${id}`;
        for (const { name: contextName } of contexts) {
            const matchedRoute = `${editUrl}/${contextName}`;
            if (!this.getDynamicRoute(matchedRoute)) {
                const baseNode = new MenuNode(name, matchedRoute, name, true);
                const { breadcrumbs, childNode } = this.currentLocation;
                if (childNode) {
                    childNode.queryParamsHandling = 'merge';
                }
                baseNode.breadcrumbs = [...breadcrumbs, { ...childNode }];
                const dynamicNode = {
                    isSystem: false,
                    breadcrumbs: [...baseNode.breadcrumbs],
                    childNode: { ...baseNode },
                    parentNode: { ...childNode },
                };

                dynamicNode.parentNode.nodes = [{ ...baseNode, url: matchedRoute }];
                const matchedRoutes = this.getDynamicRoute(editUrl)
                    ? [matchedRoute]
                    : [matchedRoute, editUrl];
                this.setDynamicRoute(matchedRoutes, dynamicNode, url);
            }
        }
    }

    dynamicallyUpdateReportsNode(entityType: string, entityId: string) {
        const reportsLang = this.LANG.appHeader.headerMenuNodes.reports;
        const reportsNode = this.nodes.find(node => node.name === reportsLang.displayName);
        if (reportsNode) {
            const serviceUsageNode = reportsNode.nodes.find(
                node => node.name === reportsLang.nodes.serviceUsage.displayName,
            );
            const serviceChangesNode = reportsNode.nodes.find(
                node => node.name === reportsLang.nodes.serviceChanges.displayName,
            );
            if (serviceUsageNode) {
                serviceUsageNode.url = `/reports/${entityType}/${entityId}/service-usage`;
            }
            if (serviceChangesNode) {
                serviceChangesNode.url = `/reports/${entityType}/${entityId}/service-changes`;
            }
            const newNodes = this.nodes.map(node =>
                node.name === reportsLang.displayName ? reportsNode : node,
            );
            this.nodes$.next(newNodes);
        }
    }

    setLocation(url?): void {
        const bestMatch: any = {};
        // Check if system url or go through nodes
        const settingsBase = environment.isLocal ? '/settings' : '/systems';
        const dynamicRoute = this.getDynamicRoute(url);
        if (dynamicRoute) {
            this.currentLocation = dynamicRoute;
            return;
        } else if (
            url.startsWith(settingsBase) ||
            (environment.isLocal &&
                (url.startsWith('/view') ||
                    url.startsWith('/health') ||
                    url.startsWith('/bookmarks') ||
                    url.startsWith('/monitoring')))
        ) {
            bestMatch.isSystem = true;
            bestMatch.parentNode = this.menusService.currentSystemNode$.value;
            const systemId = environment.isLocal ? '' : this.activeSystem$.value?.id;
            const systemUrl = `${settingsBase}${environment.isLocal ? '' : '/'}${systemId}`;
            const viewUrl = environment.isLocal ? '/view' : systemUrl + '/view';
            const healthUrl = environment.isLocal ? '/health' : systemUrl + '/health';
            const bookmarkUrl = environment.isLocal ? '/bookmarks' : systemUrl + '/bookmarks';
            const monitoringUrl = environment.isLocal ? '/monitoring' : systemUrl + '/monitoring';
            const layoutsUrl = environment.isLocal ? '/layouts' : systemUrl + '/layouts';
            const servicesUrl = environment.isLocal ? '/services' : systemUrl + '/services';

            if (url.startsWith(viewUrl)) {
                this.menusService.endpoint = { view: true };
                bestMatch.path = viewUrl;
            } else if (url.startsWith(healthUrl)) {
                this.menusService.endpoint = { information: true };
                bestMatch.path = healthUrl;
            } else if (url.startsWith(bookmarkUrl)) {
                this.menusService.endpoint = { bookmarks: true };
                bestMatch.path = bookmarkUrl;
            } else if (url.startsWith(monitoringUrl)) {
                this.menusService.endpoint = { monitoring: true };
                bestMatch.path = monitoringUrl;
            } else if (url.startsWith(layoutsUrl)) {
                this.menusService.endpoint = { layouts: true };
                bestMatch.path = layoutsUrl;
            } else if (url.startsWith(servicesUrl)) {
                this.menusService.endpoint = { services: true };
                bestMatch.path = servicesUrl;
            } else if (url.startsWith(systemUrl)) {
                this.menusService.endpoint = { settings: true };
                bestMatch.path = systemUrl;
            } else {
                bestMatch.parentNode = undefined;
                bestMatch.path = settingsBase;
            }
        } else {
            bestMatch.isSystem = false;
            const recursivelyFindMatch = NxHeaderService.findMatchFactory(url, bestMatch);
            recursivelyFindMatch(this.nodes);
        }
        this.currentLocation = bestMatch;
    }

    static findMatchFactory(url: any, target: Record<any, any> = {}, removeFirstBreadcrumb = true) {
        return startingNodes => {
            const nodes = [...startingNodes];
            for (let i = 0; i < nodes.length; i++) {
                const parentNode = nodes[i];
                for (let j = 0; j < nodes[i].nodes.length; j++) {
                    const node = parentNode.nodes[j];
                    nodes.push(node);
                    if (node.url) {
                        const nodeUrl = node.url.startsWith('/') ? node.url : `/${node.url}`;
                        if (
                            nodeUrl === url ||
                            (url.startsWith(nodeUrl) &&
                                (!target.path || target.path.length < nodeUrl.length))
                        ) {
                            target.path = node.url;
                            target.assetId = node.asset_id;
                            target.parentNode = parentNode;
                            target.childNode = node;
                            if (removeFirstBreadcrumb) {
                                node.breadcrumbs?.pop();
                            }
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
    handleNav(
        { url, new_window: newWindow, queryParamsHandling = '' }: MenuNodeNavProps,
        event: MouseEvent,
    ): void {
        const openNewWindow = newWindow || event?.metaKey || event?.ctrlKey;
        this.showSubject.next(false);
        const urlPattern =
            /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=\+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w\-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\\w]*))?)/;
        if (urlPattern.test(url)) {
            if (!url.startsWith('http')) {
                url = `http://${url}`;
            }
            this.window.open(url, openNewWindow ? '_blank' : '_self');
        } else if (openNewWindow) {
            const serializedUrl = this.router.serializeUrl(this.router.createUrlTree([url]));
            this.window.open(serializedUrl, '_blank');
        } else {
            this.router.navigate([url], { queryParamsHandling }).catch(ex => {
                console.error(ex);
            });
        }
    }
}
