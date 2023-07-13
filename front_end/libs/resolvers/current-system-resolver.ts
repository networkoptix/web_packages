import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';

import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

export const currentSystemResolver: ResolveFn<NxSystem> = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => inject(NxSystemService).getCurrentSystem();
