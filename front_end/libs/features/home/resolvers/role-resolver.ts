import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';

import { NxAccountService } from '@services/account.service';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { OrgRoleIds } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export const RoleResolver: ResolveFn<boolean> = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean | Observable<boolean> | Promise<boolean> => {
    const CPService: NxChannelPartnersService = inject(NxChannelPartnersService);
    const accountService: NxAccountService = inject(NxAccountService);
    const {
        params: { organizationId, partnerId },
    } = CPService.paramStateHandler.getInstantState(route);
    const userEmail = accountService.email;
    const adminRoles = [OrgRoleIds.OrgAdmin];
    const adminCheck = (roles: string[]): boolean => {
        const isAdmin = roles.some(role => adminRoles.includes(role));
        // Need to assign here as router data wont be available to child guards
        route.parent.data = { ...route.parent.data, isAdmin };
        return isAdmin;
    };

    return firstValueFrom(
        organizationId
            ? CPService.getOrganizationUser(organizationId, userEmail)
            : CPService.getChannelPartnerUser(partnerId, userEmail),
    )
        .then(({ roles }) => {
            return adminCheck(roles);
        })
        .catch(_ => false);
};
