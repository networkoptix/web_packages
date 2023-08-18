import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';

import { NxApplyService } from '@services/apply.service';

export const ApplyGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Promise<boolean> => {
    return inject(NxApplyService).canMove();
};
