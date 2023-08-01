import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    createUrlTreeFromSnapshot,
    ResolveFn,
    Router,
    RouterStateSnapshot,
} from '@angular/router';

import { NxUser } from '@services/system-user.types';
import { NxSystemService } from '@services/system.service/system.service';
import { cleanId } from '@utils/general';

export const userResolver: ResolveFn<NxUser> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const router: Router = inject(Router);
    const currentSystem = inject(NxSystemService).getCurrentSystem();
    const userId = `{${route.params.userId}}`;
    const users = currentSystem.userManager.users;
    const user = users?.find(({ id }) => id === userId);
    if (user) {
        return user;
    }
    await router.navigateByUrl(createUrlTreeFromSnapshot(route, ['../', cleanId(users[0]?.id)]));
    return users[0];
};
