import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { patchState, signalStore, withMethods } from '@ngrx/signals';
import {
    addEntity,
    removeEntities,
    removeEntity,
    setAllEntities,
    withEntities,
} from '@ngrx/signals/entities';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Observable, catchError, map, of, take } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { selectCurrentOrganization } from '@pages/home/store/channel-partners/channel-partners.selectors';
import {
    selectCurrentGroupId,
    selectCurrentGroups,
    selectCurrentPath,
    selectInGroup,
} from '@pages/home/store/groups/groups.selectors';
import {
    GroupRole,
    OrgCardItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';

import { NxUsersTableComponent } from '../../users-table/users-table.component';
import { UserRecord, UserType } from '../channel-partner-users/channel-partner-users.types';

const GroupStore = signalStore(
    withEntities<UserRecord>(),
    withMethods(store => ({
        addGroup: group => patchState(store, addEntity(group, { idKey: 'groupId' })),
        removeGroup: group => patchState(store, removeEntity(group)),
        removeGroups: groups => patchState(store, removeEntities(groups)),
        setGroups: groups => patchState(store, setAllEntities(groups, { idKey: 'groupId' })),
    })),
);

@Component({
    selector: 'nx-access-table',
    templateUrl: 'access-table.component.html',
    styleUrls: [
        'access-table.component.scss',
        '../../../organizations/cards-container/org-cards-container.component.scss',
    ],
    imports: [
        NxUsersTableComponent,
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
    ],
    providers: [GroupStore],
    standalone: true,
})
export class NxAccessTableComponent implements OnInit {
    LANG = staticLang;
    UserType = UserType;
    OrgCardItem = OrgCardItem;
    icons = icons;
    groupStore = inject(GroupStore);

    @Input() email: string = '';

    inGroup$$ = this.store.selectSignal(selectInGroup);
    orgRoles$$ = toSignal(this.cpService.getOrganizationRoles());
    headers: HEADER_ITEM[];
    fullName$$ = signal('');
    selectedGroups: { [key: string]: UserRecord } = {};

    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    groupItems$$ = this.store.selectSignal(selectCurrentGroups);
    currentGroupId$$ = this.store.selectSignal(selectCurrentGroupId);
    currentGroups$$ = this.store.selectSignal(selectCurrentGroups);
    groupsPath$$ = this.store.selectSignal(selectCurrentPath);
    currentPath$$ = computed(() => {
        // Todo:
        // Add all organizations if current user is a CP user
        const groupsPath = this.groupsPath$$();
        const currentOrg = this.currentOrg$$();
        return [
            { type: OrgCardItem.ORG, name: currentOrg?.name, id: currentOrg?.id },
            ...groupsPath
                .reverse()
                .map(group => ({ type: OrgCardItem.GROUP, name: group.name, id: group.id })),
        ];
    });

    constructor(
        private cpService: NxChannelPartnersService,
        private store: Store,
        private router: Router,
        private route: ActivatedRoute,
        private dialogService: NxDialogsService,
        private translateService: TranslateService,
    ) {}

    ngOnInit(): void {
        this.headers = [
            { name: 'accessLevel', value: this.LANG.channelPartners.usersTableHeaders.accessLevel },
            { name: 'groups', value: this.LANG.channelPartners.usersTableHeaders.groups },
        ];
        let request: Observable<UserRecord[]>;
        if (this.inGroup$$()) {
            request = this.cpService.getGroupUsersWithAccess(this.currentGroupId$$()).pipe(
                take(1),
                map(res => {
                    const user = res.find(user => user.email === this.email);
                    const userType =
                        user?.hasAccessTo?.membershipType === UserType.ORGANIZATION
                            ? UserType.ORGANIZATION
                            : UserType.GROUP;
                    if (user) {
                        this.fullName$$.set(user.fullName);
                        return [
                            {
                                userType,
                                userId: this.email,
                                email: this.email,
                                isOrgUser: userType === UserType.ORGANIZATION,
                                roles: user.roles,
                                groupRoles: [
                                    {
                                        name: user.hasAccessTo?.name,
                                        groupId: user.hasAccessTo?.id,
                                        roles: user.roles,
                                        roleIds: user.roleIds,
                                    },
                                ],
                            },
                        ];
                    }
                    return [];
                }),
                catchError(err => {
                    console.error(err);
                    return of([]);
                }),
            );
        } else {
            request = this.cpService.getOrganizationUser(this.currentOrg$$()?.id, this.email).pipe(
                take(1),
                map(({ groupRoles, fullName, roles }) => {
                    this.fullName$$.set(fullName);

                    // Org users do not have groupRoles
                    if (!groupRoles.length) {
                        return roles.map(role => ({
                            userType: UserType.ORGANIZATION,
                            userId: this.email,
                            email: this.email,
                            isOrgUser: true,
                            roles: [role],
                        }));
                    }
                    // TODO: bug with groupItems being undefined when loading directly into access table
                    const groupItems = this.groupItems$$();
                    const groupMap = new Map(groupItems?.map(group => [group.id, group]));
                    return groupRoles.map(group => {
                        // Todo, add path once API updated
                        const currGroup = groupMap.get(group.groupId);
                        const groupItem: GroupRole = {
                            ...currGroup,
                            name: currGroup?.name,
                            groupId: currGroup?.id,
                            roleIds: [],
                        };

                        return {
                            userType: UserType.GROUP,
                            roles: [],
                            groupId: group.groupId,
                            groupRoles: [groupItem],
                            userId: this.email,
                            email: this.email,
                        };
                    });
                }),
            );
        }
        request.subscribe((groups: UserRecord[]) => {
            this.groupStore.setGroups(groups);
        });
    }

    onPathItemClick(item: { type: OrgCardItem; name: string; id: string }): void {
        if (item.type === OrgCardItem.ORG) {
            this.router.navigate(['home', 'organization', item.id]);
        } else {
            this.router.navigate(['group', item.id], { relativeTo: this.route });
        }
    }

    addAccess(): void {
        const roles = this.orgRoles$$();
        const org = this.currentOrg$$();
        const groups = this.currentGroups$$();
        if (org) {
            const users = this.groupStore.entities();
            this.dialogService
                .addOrgUserV2({ organization: org, roles, groups, users, email: this.email })
                .then(user => {
                    this.groupStore.addGroup({
                        ...user,
                        userId: user.email,
                        userType: 'groupRoles' in user ? UserType.ORGANIZATION : UserType.GROUP,
                    });
                });
        }
    }

    deleteUser(row: UserRecord): void {
        const selectedGroupsLength = Object.keys(this.selectedGroups).length;
        const deleteMultiple = selectedGroupsLength > 1;
        const message = deleteMultiple
            ? this.translateService.instant(
                  this.LANG.channelPartners.usersTable.deleteDialog.multipleMessage,
                  {
                      count: selectedGroupsLength,
                  },
              )
            : this.translateService.instant(
                  this.LANG.channelPartners.usersTable.deleteDialog.singleMessage,
                  {
                      name: row.fullName,
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
            .then(confirm => {
                if (confirm) {
                    if (deleteMultiple) {
                        this.groupStore.removeGroups(Object.keys(this.selectedGroups));
                    } else {
                        this.groupStore.removeGroup(row.groupId);
                    }
                }
            });
    }

    updateSelectedUsers(groups: { [key: string]: UserRecord }): void {
        this.selectedGroups = groups;
    }
}
