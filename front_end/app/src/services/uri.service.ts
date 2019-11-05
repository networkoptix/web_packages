import { Inject, Injectable, PLATFORM_ID }       from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Observable }                            from 'rxjs';
import { isPlatformBrowser, Location }           from '@angular/common';

class Queue<T> {
  _store: T[] = [];
  push(val: T) {
    this._store.push(val);
  }
  pop(): T | undefined {
    return this._store.shift();
  }
}

interface Params {
    [key: string]: any;
}

@Injectable({
    providedIn: 'root'
})
export class NxUriService {
    queue: Queue<Params> = new Queue<Params>();

    private _pageOffset: number;

    constructor(private router: Router,
                private location: Location,
                private route: ActivatedRoute,
                @Inject(PLATFORM_ID) private platformId: object) {
    }

    set pageOffset(val) {
        this._pageOffset = val;
    }

    get pageOffset() {
        return this._pageOffset;
    }

    getURL() {
        return this.router.url.split('?')[0];
    }

    getURI(): Observable<any> {
        return this.route.queryParams;
    }

    updateURI(navigateTo?: string, queryParams: any = {}, replace?) {
        const params: Params = {navigateTo, queryParams, replace};
        this.queue.push(params);

        // Keeps checking queue until it's turn to navigate
        const interval = setInterval(_ => {
            if (this.queue._store[0] === params) {
                if (!navigateTo) {
                    navigateTo = this.getURL();
                }
                replace = replace ? replace : false;
                // changes the route without moving from the current view
                this.router.navigate([navigateTo], {
                    queryParams,
                    relativeTo: this.route,
                    replaceUrl: replace,
                    queryParamsHandling: 'merge'
                }).then(_ => {
                    this.queue.pop();
                    clearInterval(interval);
                });
            }
        });
    }

    resetURI(navigateTo: string, queryParams: any = {}) {
        this.router.navigate([navigateTo], {
            queryParams,
            relativeTo: this.route,
            replaceUrl: false,
        });
    }
}
