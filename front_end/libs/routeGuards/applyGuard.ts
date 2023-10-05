import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';

import { NxApplyService } from '@services/apply.service';
import { NxApplyServiceV2 } from '@services/apply.service/apply-v2.service';

export const ApplyGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Promise<boolean> => {
    return inject(NxApplyService).canMove();
};

export const ApplyGuardV2: CanActivateFn = (): Promise<boolean> => {
    return inject(NxApplyServiceV2).canMove();
};
