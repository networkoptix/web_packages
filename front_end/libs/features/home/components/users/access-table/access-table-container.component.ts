import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { selectCurrentOrganization } from '@common/store/channel-partners/channel-partners.selectors';
import { NxSearchComponent } from '@components/search/search.component';
import type { SearchFilter } from '@components/search/search.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { HEADER_ITEM } from '@pages/home/home.types';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import { ChannelPartnersRouteState } from '@pages/home/store/route-state/route-state.store';
import { PipesModule } from '@pipes/pipes.module';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { nxConfig } from '@services/nx-config/config';
import { icons } from '@static-variables';
import { accountSelectors } from '@store/account';

import { NxUsersAccessTableComponent } from '../../users-table/refactor/access-table/access-table.component';
import { NxUsersTableComponent } from '../../users-table/users-table.component';
import { UserRecord, UserType } from '../channel-partner-users/channel-partner-users.types';

@Component({
    selector: 'nx-access-table-container',
    templateUrl: 'access-table-container.component.html',
    styleUrls: [
        'access-table-container.component.scss',
        '../../../organizations/cards-container/org-cards-container.component.scss',
    ],
    imports: [
        NxUsersTableComponent,
        NxUsersAccessTableComponent,
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        RouterModule,
        PipesModule,
        FormsModule,
        NxSearchComponent,
    ],
    standalone: true,
})
export class NxAccessTableContainerComponent {
    LANG = staticLang;
    CONFIG = nxConfig;
    UserType = UserType;
    icons = icons;

    @Input() email: string = '';
    @ViewChild(NxUsersAccessTableComponent) accessTable!: NxUsersAccessTableComponent;
    searchModel: SearchFilter = { query: '' };

    orgUsersStore = inject(OrgUsersStore);
    accountEmail$$ = this.store.selectSignal(accountSelectors.selectCurrentUserName);

    orgRoles$$ = this.cpService.organizationRoles$$;
    orgRecords$$ = this.orgUsersStore.usersByGroupSignalFactory();
    isOrgUser$$ = computed(
        () => this.orgRecords$$().find(user => user.email === this.email)?.isOrgUser,
    );
    fullName$$ = computed(() => {
        const fullName = this.orgRecords$$().find(
            u => u.email === this.email && u.fullName !== 'N/A',
        )?.fullName;
        if (fullName) {
            return `${fullName}, ${this.email}`;
        }

        return this.email;
    });

    // Remove once v2 ready
    //
    userRecords$$ = computed(() => {
        const orgRecords = this.orgRecords$$();
        return orgRecords
            .filter(({ email }) => email === this.email)
            .flatMap(user => {
                if (user.userType === UserType.GROUP) {
                    return user.groupRoles!.map(groupRole => {
                        return {
                            ...user,
                            userId: this.email,
                            email: this.email,
                            groupRoles: [groupRole],
                            roles: groupRole.roles,
                            rolesIds: groupRole.rolesIds,
                            accessId: groupRole.groupId,
                        };
                    });
                }
                user.accessId = this.currentOrg$$()?.id;
                return user;
            });
    });
    headers: HEADER_ITEM[] = [
        { name: 'accessLevel', value: this.LANG.channelPartners.usersTableHeaders.accessLevel },
        { name: 'groups', value: this.LANG.channelPartners.usersTableHeaders.groups },
    ];
    selectedGroups: { [key: string]: UserRecord } = {};
    selectedCount = 0;

    deleteUser(row: UserRecord): void {
        const selectedGroupsLength = Object.keys(this.selectedGroups).length;
        const deleteMultiple = selectedGroupsLength > 1;
        const message = deleteMultiple
            ? this.translateService.instant(
                  this.LANG.channelPartners.usersTable.deleteDialog.multipleAccessRole,
                  {
                      name: this.fullName$$(),
                      count: selectedGroupsLength,
                  },
              )
            : this.translateService.instant(
                  this.LANG.channelPartners.usersTable.deleteDialog.singleAccessRole,
                  {
                      name: this.fullName$$(),
                      folder: row?.accessLevel?.name || '',
                  },
              );
        this.dialogService
            .confirm({
                message,
                title: this.LANG.channelPartners.usersTable.deleteDialog.title,
                footer: {
                    actionLabel:
                        this.LANG.channelPartners.usersTable.deleteDialog.footer.actionLabel,
                    cancelLabel:
                        this.LANG.channelPartners.usersTable.deleteDialog.footer.cancelLabel,
                    buttonClass: 'btn-danger',
                },
            })
            .then(async confirm => {
                if (confirm) {
                    Object.values(this.selectedGroups).map(userRecord =>
                        this.orgUsersStore.removeUser(this.currentOrg$$()!.id, userRecord.email, [
                            userRecord.groupRoles![0].groupId,
                        ]),
                    );
                }
            });
    }
    //
    // End remove

    groupsStore = inject(GroupsStore);
    routerState = inject(ChannelPartnersRouteState);

    inGroup$$ = computed(() => !this.groupsStore.currentGroupId$$().isRoot);
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    currentGroupId$$ = computed(
        () => this.cpService.paramStateHandler.state$$().params?.groupId || '',
    );
    currentGroups$$ = this.groupsStore.currentGroups$$;
    groupsPath$$ = this.groupsStore.groupsPath$$;
    currentPath$$ = computed(() => {
        // Todo:
        // Add all organizations if current user is a CP user
        const groupsPath = this.groupsPath$$();
        const currentOrg = this.currentOrg$$()!;
        return [currentOrg, ...groupsPath.reverse()];
    });

    constructor(
        private cpService: NxChannelPartnersService,
        private store: Store,
        private dialogService: NxDialogsService,
        private translateService: TranslateService,
    ) {}

    setQuery(model: SearchFilter): void {
        this.orgUsersStore.setSearchQuery(model.query);
    }

    addAccess(): void {
        this.dialogService.addOrgUserV2({
            organization: this.currentOrg$$()!,
            email: this.email,
        });
    }

    // temporary any typing until we rid other users table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateSelectedUsers(groups: any): void {
        this.selectedGroups = groups;
    }

    updateSelectedCount(count: number): void {
        this.selectedCount = count;
    }
}
