import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Location }                        from '@angular/common';
import { ActivatedRoute, Router, Params }  from '@angular/router';
import { BehaviorSubject, Observable }     from 'rxjs';
import { NxConfigService, IConfig }        from './nx-config';
import { localSettingsRoutes }             from '../pages/systems/webadmin-system.module';
import { cloudSettingsRoutes }             from '../pages/systems/settings/settings.module';

export enum ChildRoutes {
    CAMERAS='cameras',
    SERVERS='servers',
    USERS='users',
    VIEW='view',
    HEALTH='health'
}

export type RouteResolverParams = {systemId?: string, cameraId: string} |
    {systemId?: string, serverId: string} |
    {systemId?: string, userId: string} |
    {systemId?: string, childRoute?: ChildRoutes};

@Injectable({
    providedIn: 'root'
})
export class NxUriService {
    private CONFIG: IConfig;
    private _pageOffset: number;

    queryParamsSubject: BehaviorSubject<Params> = new BehaviorSubject({});

    constructor(
        configService: NxConfigService,
        private router: Router,
        private route: ActivatedRoute,
        private location: Location,
        @Inject(PLATFORM_ID) private platformId: object
    ) {
        this.CONFIG = configService.config;
    }

    get queryParams() {
        return this.queryParamsSubject.getValue();
    }

    set queryParams(params: Params) {
        if (params !== this.queryParams) {
            this.queryParamsSubject.next(params);
        }
    }

    set pageOffset(val: number) {
        this._pageOffset = val;
    }

    get pageOffset() {
        return this._pageOffset;
    }

    getURL() {
        return this.router.url.split('?')[0];
    }

    getURI(): Observable<Params> {
        return this.route.queryParams;
    }

    navigateSystem(navigateTo, system) {
        navigateTo = (this.CONFIG.isLocal)
            ? navigateTo.replace('SYSTEM_ID', '')
            : navigateTo.replace('SYSTEM_ID', '/' + system.id);

        return new Promise<boolean>((resolve, reject) => {
            setTimeout(() => {
                return this.router.navigate([navigateTo], {})
                    .then(success => {
                        resolve(success);
                    }, error => {
                        reject(error);
                    });
            });
        });
    }

    updateURI(navigateTo?: string, queryParams: Params = {}, replace?: boolean) {
        if (!navigateTo) {
            navigateTo = this.getURL();
        }

        replace = replace || false;
        // changes the route without moving from the current view
        return new Promise<boolean>((resolve, reject) => {
            setTimeout(() => {
                return this.router.navigate([navigateTo], {
                    queryParams,
                    relativeTo          : this.route,
                    replaceUrl          : replace || this.CONFIG.isLocal,
                    queryParamsHandling : 'merge'
                }).then(success => {
                    resolve(success);
                }, error => {
                    reject(error);
                });
            });
        });
    }

    resetURI(navigateTo: string, queryParams: Params = {}) {
        this.router
            .navigate([navigateTo], {
                queryParams,
                relativeTo : this.route,
                replaceUrl : false
            })
            .catch(error => { console.error(error); });
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
    getSystemSettingsRoute(params: RouteResolverParams = {}) {
        const { systemId = '', ..._otherParams } = params;
        const otherParams = Object.entries(_otherParams);
        const routesConfig = NxConfigService.resolveLocalOrCloud(localSettingsRoutes, cloudSettingsRoutes);
        let base = this.CONFIG.menus.systemSettings.baseUrl;
        let childRoute = '';
        if (!this.CONFIG.isLocal) {
            base += params.systemId;
        }

        if (otherParams.length) {
            const [[param, value]] = otherParams;
            const child = { ...routesConfig[0].children.find(({ path }) => path.includes(param)) };
            const isChildRoute = param === 'childRoute';
            childRoute = '/' + (isChildRoute ? value : child.path.replace(':' + param, <string> value)) + '/';

            if (this.CONFIG.isLocal && isChildRoute && value === ChildRoutes.HEALTH || value === ChildRoutes.VIEW) {
                base = '/';
                childRoute += '/';
            }
        }
        return base + childRoute;
    }
}
