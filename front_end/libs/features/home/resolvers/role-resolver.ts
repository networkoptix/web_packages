import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';

import { NxAccountService } from '@services/account.service';

import { NxChannelPartnersService } from '../services/channel-partners.service';

import { OrgResolver } from './org-resolver';

@Injectable()
export class RoleResolver implements Resolve<boolean> {
    constructor(
        private CPService: NxChannelPartnersService,
        private accountService: NxAccountService,
        private OrgResolver: OrgResolver,
    ) {}

    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ): boolean | Observable<boolean> | Promise<boolean> {
        const inOrganization = this.OrgResolver.resolve(route, state);
        const id = route.params.id;
        const userEmail = this.accountService.email;
        const adminRoles = ['Administrator', 'Organization Administrator'];

        const adminCheck = (roles: string[]): boolean => {
            const isAdmin = roles.some(role => adminRoles.includes(role));
            // Need to assign here as router data wont be available to child guards
            route.parent.data = { ...route.parent.data, isAdmin };
            return isAdmin;
        };

        return firstValueFrom(
            inOrganization
                ? this.CPService.getOrganizationUser(id, userEmail)
                : this.CPService.getChannelPartnerUser(id, userEmail),
        )
            .then(({ roles }) => {
                return adminCheck(roles);
            })
            .catch(_ => false);
    }
}
