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

import { selectCurrentOrganization } from '@common/store/channel-partners/channel-partners.selectors';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { HEADER_ITEM } from '@pages/home/home.types';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { GroupRole } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
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
    icons = icons;
    groupStore = inject(GroupStore);

    @Input() email: string = '';

    orgRoles$$ = toSignal(this.cpService.getOrganizationRoles());
    headers: HEADER_ITEM[];
    fullName$$ = signal('');
    selectedGroups: { [key: string]: UserRecord } = {};

    groupsStore = inject(GroupsStore);

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
                                        rolesIds: user.rolesIds,
                                    },
                                ],
                                groupId: UserType.ORGANIZATION,
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
                            groupId: UserType.ORGANIZATION,
                        }));
                    }
                    // TODO: bug with groupItems being undefined when loading directly into access table
                    const groupItems = this.currentGroups$$();
                    const groupMap = new Map(groupItems?.map(group => [group.id, group]));
                    return groupRoles.map(group => {
                        // Todo, add path once API updated
                        const currGroup = groupMap.get(group.groupId);
                        const groupItem: GroupRole = {
                            ...currGroup,
                            groupId: group?.groupId,
                            roles: group.roles,
                            rolesIds: [],
                        };

                        return {
                            userType: UserType.GROUP,
                            roles: group.roles,
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

    onPathItemClick(id: string): void {
        if (id === this.currentOrg$$()!.id) {
            this.router.navigate(['home', 'organization', id]);
        } else {
            this.router.navigate(['group', id], { relativeTo: this.route });
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
                    if (user) {
                        const accessLevel = (('accessLevel' in user && user.accessLevel) ??
                            {}) as Record<string, string>;
                        const groupId = accessLevel?.id || UserType.ORGANIZATION;
                        this.groupStore.addGroup({
                            ...user,
                            groupId,
                            userId: user.email,
                            userType: 'groupRoles' in user ? UserType.ORGANIZATION : UserType.GROUP,
                        });
                    }
                });
        }
    }

    deleteUser(row: UserRecord): void {
        const selectedGroupsLength = Object.keys(this.selectedGroups).length;
        const deleteMultiple = selectedGroupsLength > 1;
        const message = deleteMultiple
            ? this.translateService.instant(
                  this.LANG.channelPartners.usersTable.deleteDialog.multipleAccessRole,
                  {
                      name: row.fullName || row.email,
                      count: selectedGroupsLength,
                  },
              )
            : this.translateService.instant(
                  this.LANG.channelPartners.usersTable.deleteDialog.singleAccessRole,
                  {
                      name: row.fullName || row.email,
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
            .then(confirm => {
                if (confirm) {
                    let deleteRequest: Observable<unknown>;
                    let deletedIds: string[] = [];
                    const orgId = this.currentOrg$$().id;
                    if (row.isOrgUser) {
                        deletedIds = [UserType.ORGANIZATION];
                        deleteRequest = this.cpService.deleteOrganizationUser(orgId, this.email);
                    } else {
                        const groupsToDelete: string[] = deleteMultiple
                            ? Object.keys(this.selectedGroups)
                            : row.groupId
                              ? [row.groupId]
                              : [];
                        deletedIds = groupsToDelete;
                        deleteRequest = this.cpService.deleteBulkUserGroups(
                            orgId,
                            this.email,
                            groupsToDelete,
                        );
                    }
                    deleteRequest.subscribe(() => {
                        this.groupStore.removeGroups(deletedIds);
                    });
                }
            });
    }

    updateSelectedUsers(groups: { [key: string]: UserRecord }): void {
        this.selectedGroups = groups;
    }
}
