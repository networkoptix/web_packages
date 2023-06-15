import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable()
export class CPResovler implements Resolve<boolean> {
    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ): boolean | Observable<boolean> | Promise<boolean> {
        return state.url.includes('channelPartners/');
    }
}
