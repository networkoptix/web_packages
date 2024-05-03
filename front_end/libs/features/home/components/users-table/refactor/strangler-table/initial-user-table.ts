import { inject, Directive } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';

import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language/language_i18n_static.json';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { ChannelPartnersRouteState } from '@pages/home/store/route-state/route-state.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { icons } from '@static-variables';

import { UserRecord } from '../../../users/channel-partner-users/channel-partner-users.types';

/**
 * This is the code copied from the original user table.
 */
@Directive()
export abstract class InitialUserTable {
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

    hasMultipleRoles(user: UserRecord): boolean {
        return user.groupRoles?.length > 1 || user.roles?.length > 1;
    }
}
