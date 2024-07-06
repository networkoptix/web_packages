import { Directive, ViewChild, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { NxCheckAllContainerDirective } from '@components/checkbox/checkbox-check-all-container.directive';
import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language/language_i18n_static.json';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { ChannelPartnersRouteState } from '@pages/home/store/route-state/route-state.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { icons } from '@static-variables';

import { UserRecord } from '../../users/channel-partner-users/channel-partner-users.types';
import { TranslatedOrgPermissions } from '../../users/org-users/org-users.types';

@Directive()
export abstract class AbstractUserTableDirective {
    protected store = inject(Store);
    protected orgUsersStore = inject(OrgUsersStore);
    protected cpService = inject(NxChannelPartnersService);
    protected translateService = inject(TranslateService);
    protected dialogService = inject(NxDialogsService);
    protected groupsStore = inject(GroupsStore);
    protected permissionStore = inject(PermissionsStore);
    protected routerState = inject(ChannelPartnersRouteState);
    protected readonly PAGE_PLACEHOLDER = PAGE_PLACEHOLDER;

    icons = icons;
    LANG = staticLang;

    checkAllContainer = new BehaviorSubject<undefined | NxCheckAllContainerDirective>(undefined);
    checkAllContainer$$ = toSignal(this.checkAllContainer, { initialValue: null });

    // Since the code runs everytime the dom is updated, we'll pre-translate the descriptions and names here
    // { roleId: { "name": roleName, "description": roleDescription }, .. }
    translatedOrgPermissions = Object.entries(this.LANG.channelPartners.orgs.orgRoleInfo).reduce(
        (roles, [key, value]) => {
            roles[key] = {
                name: this.translateService.instant(value.name),
                description: this.translateService.instant(value.description).replaceAll('| ', ''),
            };
            return roles;
        },
        {} as Record<string, TranslatedOrgPermissions>,
    );

    @ViewChild(NxCheckAllContainerDirective) set setContainerRef(
        checkAllContainerRef: NxCheckAllContainerDirective,
    ) {
        this.checkAllContainer.next(checkAllContainerRef);
    }

    protected abstract getDisplayRole(user: UserRecord): string;

    hasMultipleRoles(user: UserRecord): boolean {
        return user.groupRoles?.length > 1 || user.roles?.length > 1;
    }

    uncheckAll(): void {
        this.checkAllContainer$$()?.toggleAllBoxes(true); // true = Unchecks all boxes
    }

    permissionName(roleId: string): string {
        return this.translatedOrgPermissions[roleId]?.name ?? '';
    }

    permissionDescription(roleId: string): string {
        return this.translatedOrgPermissions[roleId]?.description ?? '';
    }
}
