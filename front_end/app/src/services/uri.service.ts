import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router, Params }  from '@angular/router';
import { BehaviorSubject, Observable }     from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxUriService {
    private _pageOffset: number;

    queryParamsSubject: BehaviorSubject<Params> = new BehaviorSubject({});

    constructor(private router: Router,
                private route: ActivatedRoute,
                @Inject(PLATFORM_ID) private platformId: object) {
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
                    replaceUrl          : replace,
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
}
