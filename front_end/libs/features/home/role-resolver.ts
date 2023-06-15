import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';

import { NxAccountService } from '@services/account.service';

import { OrgResolver } from './resolvers/org-resolver';
import { NxChannelPartnersService } from './services/channel-partners.service';

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

        const isAdmin = (roles: string[]): boolean => {
            const _isAdmin = roles.includes('Administrator');
            route.parent.data = { ...route.parent.data, isAdmin: _isAdmin };
            return _isAdmin;
        };

        return firstValueFrom(
            inOrganization
                ? this.CPService.getOrganizationUser(id, userEmail)
                : this.CPService.getChannelPartnerUser(id, userEmail),
        )
            .then(({ roles }) => {
                return isAdmin(roles);
            })
            .catch(_ => false);
    }
}
