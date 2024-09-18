import { Injectable } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { isEqual } from 'lodash-es';
import { BehaviorSubject, Observable } from 'rxjs';

import { environment } from '@environments/environment';

import { menus } from '../variables/static-variables';

import type { NxSystem } from './system.service/system';
import { ChildRoutes, RouteResolverParams } from './uri.service.types';

@Injectable({
    providedIn: 'root',
})
export class NxUriService {
    queryParamsSubject: BehaviorSubject<Params> = new BehaviorSubject({});

    constructor(
        private router: Router,
        private route: ActivatedRoute,
    ) {}

    get queryParams(): Params {
        return this.queryParamsSubject.getValue();
    }

    set queryParams(params: Params) {
        if (!isEqual(params, this.queryParams)) {
            this.queryParamsSubject.next(params);
        }
    }

    getURL(): string {
        return this.router.url.split('?')[0];
    }

    changePort(newPort: string): void {
        window.location.replace(
            `${window.location.protocol}//${window.location.hostname}:${newPort}/${window.location.hash}`,
        );
    }

    getParams(): Observable<Params> {
        return this.route.queryParams;
    }

    navigateSystem(navigateTo: string, system: NxSystem): Promise<boolean> {
        navigateTo = environment.isLocal
            ? navigateTo.replace('SYSTEM_ID', '')
            : navigateTo.replace('SYSTEM_ID', '/' + system.id);

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                return this.router.navigate([navigateTo], {}).then(
                    success => {
                        resolve(success);
                    },
                    error => {
                        reject(error);
                    },
                );
            });
        });
    }

    updateURI(
        navigateTo?: string,
        queryParams: Params = {},
        replace?: boolean,
    ): Promise<void | boolean> {
        if (!navigateTo) {
            navigateTo = this.getURL();
        }

        // updating "page" param is called in multiple places for different reasons ...
        // avoid multiple unnecessary URI (and model) updates if we update only "page" and it's same  -- TT
        if (
            Object.keys(queryParams).length === 1 &&
            queryParams.page &&
            queryParams.page === this.route.snapshot.queryParams.page
        ) {
            return Promise.resolve();
        }

        replace = replace || false;
        // changes the route without moving from the current view
        return new Promise<boolean>((resolve, reject) => {
            setTimeout(() => {
                return this.router
                    .navigate([navigateTo], {
                        queryParams,
                        relativeTo: this.route,
                        replaceUrl: replace || environment.isLocal,
                        queryParamsHandling: 'merge',
                    })
                    .then(
                        success => {
                            resolve(success);
                        },
                        error => {
                            reject(error);
                        },
                    );
            });
        });
    }

    resetURI(navigateTo: string, queryParams: Params = {}): void {
        this.router
            .navigate([navigateTo], {
                queryParams,
                relativeTo: this.route,
                replaceUrl: false,
            })
            .catch(error => {
                console.error(error);
            });
    }

    /**
     * Used to resolve routes for settings page for webadmin or for cloud. Probably will be used in header and in other places where we need to link to a specific settings page.
     *
     *
     * To get base settings page:
     *
     *      getSystemSettingsRoute()
     *
     *
     * To get childRoute:
     *
     *      getSystemSettingsRoute({ systemId, childRoute: ChildRoutes.CAMERAS })
     *
     *
     * To get route based on param:
     *
     *      getSystemSettingsRoute({ systemId, cameraId: 'id-string-here'})
     *
     *
     * @param params - Optionally accepts object with a systemId(for cloud) property and either a childRoute ex. { childRoute: cameras } or a param to target such as { cameraId: id-string-here }
     */
    getSystemSettingsRoute(params: RouteResolverParams = {}): string {
        const { systemId = '', ..._otherParams } = params;
        const otherParams = Object.entries(_otherParams);

        // const routesConfig = this.router.config.filter(route => {
        //     if (environment.isLocal) {
        //         return route.path === 'settings';
        //     } else {
        //         return route.path === 'systems/:systemId';
        //     }
        // });

        let base = menus.systemSettings.baseUrl;
        let childRoute = '';

        if (!environment.isLocal) {
            base += systemId;
        }

        if (otherParams.length) {
            const [[param, value]] = otherParams;
            // const child = { ...routesConfig[0].children.find(({ path }) => path.includes(param)) };
            const isChildRoute = param === 'childRoute';
            childRoute = '/' + (isChildRoute ? value : '') + '/';
            if ((isChildRoute && value === ChildRoutes.HEALTH) || value === ChildRoutes.VIEW) {
                if (environment.isLocal) {
                    base = '/';
                    childRoute += '/';
                }
            } else {
                // TODO: This probably needs to be refactored, temporary fix for lazy load
                // TODO: parts of this seem like it had been broken -> should investigate what else needs refactoring here
                const routeLookup = {
                    cameraId: 'cameras',
                    serverId: 'servers',
                    userId: 'users',
                };
                childRoute = childRoute.slice(-1) + routeLookup[param] + '/' + value;
            }
        }
        return base + childRoute;
    }
}
