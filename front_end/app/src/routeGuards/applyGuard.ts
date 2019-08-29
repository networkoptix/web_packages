import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanDeactivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { NxApplyService } from '../services/apply.service';


@Injectable()
export class ApplyDeactivateGuard implements CanDeactivate<any> {
    constructor(private applyService: NxApplyService) {}
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

@Injectable()
export class ApplyActivateGuard implements CanActivate {
    constructor(private applyService: NxApplyService) {}
    canActivate(route: ActivatedRouteSnapshot,
                state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        if (this.applyService.locked) {
            return this.applyService.showDialog().then((state) => {
                return state;
            });
        }
        return ! this.applyService.locked;
    }
}
