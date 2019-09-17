import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanDeactivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { NxApplyService } from '../services/apply.service';


@Injectable()
export class ApplyGuard implements CanActivate, CanDeactivate<any> {
    constructor(private applyService: NxApplyService) {}

    canActivate(route: ActivatedRouteSnapshot,
                state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        if (this.applyService.locked) {
            this.applyService.showDialog().then((state) => {
                return state;
            });
        }
        return ! this.applyService.locked;
    }

    canDeactivate(component: any,
                  currentRoute: ActivatedRouteSnapshot,
                  currentState: RouterStateSnapshot,
                  nextState?: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        if (this.applyService.locked) {
            return this.applyService.showDialog().then((state) => {
                return state;
            });
        }
        return ! this.applyService.locked;
    }
}
