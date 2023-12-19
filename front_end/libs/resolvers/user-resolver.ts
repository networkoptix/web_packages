import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router, RouterStateSnapshot } from '@angular/router';

import { NxUser } from '@services/system-user.types';
import { NxSystemService } from '@services/system.service/system.service';
import { cleanIdLegacy } from '@utils/general';

export const userResolver: ResolveFn<NxUser> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const router: Router = inject(Router);
    const currentSystem = inject(NxSystemService).getCurrentSystem();
    const userId = route.params.userId;
    const users = currentSystem.userManager.users;
    const user = users?.find(({ id }) => id.includes(userId));
    if (user) {
        const cleanUserId = cleanIdLegacy(user.id);
        if (!state.url.includes(cleanUserId)) {
            await router.navigate([state.url, cleanUserId]);
        }
        return user;
    }
    await router.navigate([state.url, cleanIdLegacy(users[0]?.id)]);
    return users[0];
};
