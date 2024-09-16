import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router, RouterStateSnapshot } from '@angular/router';

import { NxUser } from '@services/system-user.types';
import { NxSystemService } from '@services/system.service/system.service';
import { cleanIdLegacy } from '@utils/general';

export const userResolver: ResolveFn<NxUser | boolean> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const router: Router = inject(Router);
    const currentSystem = inject(NxSystemService).getCurrentSystem();
    const userId = route.params.userId;
    let users = currentSystem.userManager.users;
    if (!users) {
        for (let i = 0; i < 3; i++) {
            await currentSystem.getUsers(false, false);
            users = currentSystem.userManager.users;
            if (users?.length) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** i));
        }
    }

    let user = users?.find(({ id }) => id.includes(userId));

    if (!user) {
        user = users?.[0];
    }

    if (user) {
        const cleanUserId = cleanIdLegacy(user.id);
        if (!state.url.includes(cleanUserId)) {
            await router.navigate([state.url, cleanUserId]);
        }
        return user;
    }

    const commands = [...state.url.split('/')];
    commands.pop();
    return router.navigate(commands);
};
