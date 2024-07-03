import { Injector, inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';

import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

export const currentSystemResolver: ResolveFn<NxSystem> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const system = inject(NxSystemService).getCurrentSystem();
    const injector = inject(Injector);
    await system.permissionManager.permissionsInitialized(injector);
    return system;
};
