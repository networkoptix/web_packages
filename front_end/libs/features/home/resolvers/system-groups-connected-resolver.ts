import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';

import { NxSystemGroupsService } from '../services/system-groups.service';

export const SystemGroupsConnectedResolver: ResolveFn<boolean> = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Observable<boolean> => {
    // May refactor to check children static data opposed to url check.
    return inject(NxSystemGroupsService).connect();
};
