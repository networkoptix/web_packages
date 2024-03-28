import { CommonModule } from '@angular/common';
import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
    WritableSignal,
    booleanAttribute,
    computed,
    signal,
    inject,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import * as cpActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectChannelPartners,
    selectCurrentOrganization,
    selectCurrentPartner,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxDropdownModule } from '@components/dropdownV2/dropdown.module';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { NxBaseTableComponent } from '@components/table/table.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import staticLang from '@language/language_i18n_static.json';
import { HEADER_ITEM } from '@pages/home/home.types';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { ChannelPartnersRouteState } from '@pages/home/store/route-state/route-state.store';
import { PipesModule } from '@pipes/pipes.module';
import { NxAccountService } from '@services/account.service';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartnerRole,
    OrganizationRole,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import { UserRecord, UserType } from '../users/channel-partner-users/channel-partner-users.types';

@Component({
    selector: 'nx-users-table',
    templateUrl: 'users-table.component.html',
    styleUrls: ['users-table.component.scss'],
    standalone: true,
    imports: [
        AngularSvgIconModule,
        CommonModule,
        TranslateModule,
        NxCheckboxComponent,
        NxBaseTableComponent,
        NxAddSvgSrcDirective,
        NxDropdownModule,
        NxTooltipDirective,
        NxPagePlaceholderV2Component,
        RouterModule,
        PipesModule,
    ],
})
export class NxUsersTableComponent implements OnInit, OnChanges {
    UserType = UserType;
    groupsStore = inject(GroupsStore);
    permissionStore = inject(PermissionsStore);
    routerState = inject(ChannelPartnersRouteState);
    channelPartners$$ = this.store.selectSignal(selectChannelPartners);
    currentGroupId$$ = computed(() => this.groupsStore.currentGroupId$$()?.id);
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    currentPartner$$ = this.store.selectSignal(selectCurrentPartner);

    @Input({ transform: booleanAttribute }) inGroup: boolean;
    @Input({ transform: booleanAttribute }) accessTable: boolean;
    @Input({ required: true }) userType: UserType;
    @Input() headers: HEADER_ITEM[];
    @Input() records: UserRecord[];
    @Input() selectedRecordId: string = '';
    @Input() roles: Omit<OrganizationRole[] | ChannelPartnerRole[], 'permissions'> = [];
    @Input() searching: boolean = false;

    @Output() public onDeleteClick = new EventEmitter<UserRecord>();
    @Output() public onRowClick = new EventEmitter<UserRecord>();
    @Output() public onAdduser = new EventEmitter<never>();
    @Output() public selectedUsersEmitter = new EventEmitter<{ [key: string]: UserRecord }>();

    LANG = staticLang;

    // headers: Record<string, Record<string, number | string>>;
    // records: Record<string, string | boolean | Record<string, string>[]>[];
    selectedAll = false;
    selectedUsers: { [key: string]: UserRecord } = {};
    selectedUsersMap$$: WritableSignal<Map<string, boolean>> = signal(new Map());
    subLevels: boolean = false;
    expandRowId: string;
    icons = icons;
    hasOnlyOneAdmin$$: WritableSignal<boolean> = signal(true);
    canManageUsers$$ = computed(() => {
        const canManagePartnerUsers = this.permissionStore.canViewPartnerUsers$$();
        const canManageOrgUsers = this.permissionStore.canViewOrgUsers$$();
        return this.userType === UserType.CHANNEL_PARTNER
            ? canManagePartnerUsers
            : canManageOrgUsers;
    });

    setHeaders: Array<string>;
    rowsPerPage: Array<number>;

    public idPropName = 'userId';
    public groupPropName = 'groupId';

    constructor(
        private store: Store,
        private cpService: NxChannelPartnersService,
        private accountService: NxAccountService,
        private router: Router,
    ) {}

    ngOnInit(): void {
        this.rowsPerPage = [5, 10, 20, 50];
        this.setHeaders = [
            'userId',
            'email',
            'fullName',
            'accessLevel',
            'roles',
            'delete',
            'expand',
        ];
        if (this.userType === UserType.CHANNEL_PARTNER) {
            this.setHeaders.splice(3, 1);
            this.setHeaders.pop();
        }
        if (this.accessTable) {
            this.setHeaders = ['userId', 'accessLevel', 'roles', 'delete'];
        }
    }

    ngOnChanges(changes: NgChanges<NxUsersTableComponent>): void {
        if (changes.records?.currentValue) {
            this.findAdmins(changes.records.currentValue);
        }
    }

    expandRow(id: string): void {
        if (!this.subLevels) {
            return;
        }
        this.expandRowId = this.expandRowId && this.expandRowId === id ? '' : id; // toggle
    }

    showSubLevels(state: boolean): void {
        this.subLevels = state;
        if (!state) {
            this.expandRowId = '';
        }
    }

    selectAll(): void {
        let map: Map<string, boolean> = new Map();
        if (!this.selectedAll) {
            for (const record of this.records) {
                if (!this.selectedUsers[record.userId]) {
                    this.selectedUsers[record.userId] = record;
                }
            }
            map = new Map(Object.keys(this.selectedUsers).map(user => [user, true]));
            this.selectedUsersEmitter.emit(this.selectedUsers);
            this.selectedAll = true;
        } else {
            this.selectedUsers = {};
            this.selectedUsersEmitter.emit({});
            this.selectedAll = false;
        }
        this.selectedUsersMap$$.set(map);
    }

    selectRecord(user: UserRecord): void {
        let userId = user.userId;
        if (this.accessTable) {
            userId = user.groupRoles[0].groupId;
        }
        if (this.selectedUsers[userId]) {
            delete this.selectedUsers[userId];
        } else {
            this.selectedUsers[userId] = user;
        }
        const map = new Map(Object.keys(this.selectedUsers).map(user => [user, true]));
        this.selectedAll = this.records.length === map.size;
        this.selectedUsersMap$$.set(map);
        this.selectedUsersEmitter.emit(this.selectedUsers);
    }

    onRowClickAction(rec: UserRecord): void {
        this.onRowClick.emit({ ...rec });
    }

    getDisplayRole(user: UserRecord): string {
        let displayRole = user.roles[0];
        if (this.accessTable) {
            return displayRole;
        } else if (!this.inGroup && !user.isOrgUser && user.userType !== UserType.CHANNEL_PARTNER) {
            displayRole = user.groupRoles?.length > 1 ? 'Multiple' : user.groupRoles[0].roles[0];
        }
        return displayRole;
    }

    hasMultipleRoles(user: UserRecord): boolean {
        return user.groupRoles?.length > 1 || user.roles?.length > 1;
    }

    getRowRoleId(user: UserRecord): string {
        return this.roles?.find(role => role.name === this.getDisplayRole(user))?.id.toString();
    }

    isUserRole(role: OrganizationRole, user: UserRecord): boolean {
        return role.name === this.getDisplayRole(user);
    }

    orgUsersStore = inject(OrgUsersStore);

    updateRole(user: UserRecord, roleId: string): void {
        if (user.userType === UserType.CHANNEL_PARTNER) {
            const currPartner = this.currentPartner$$();
            this.cpService
                .updateChannelPartnerUser(currPartner.id, {
                    roleId,
                    email: user.email,
                })
                .subscribe(updatedUser => {
                    const copy = structuredClone(this.records);
                    const index = this.records.findIndex(u => u.userId === user.userId);
                    copy[index] = {
                        ...this.records[index],
                        roles: updatedUser.roles,
                        rolesIds: updatedUser.rolesIds,
                    };
                    this.records = copy;
                    this.findAdmins(copy);
                    const email = this.accountService.email;
                    if (updatedUser.email === email) {
                        const channelPartners = structuredClone(this.channelPartners$$());
                        const currPartnerIndex = channelPartners.findIndex(
                            partner => partner.id === currPartner.id,
                        );
                        const permissions = this.roles.find(
                            role => role.name === updatedUser.roles[0],
                        )?.permissions;
                        channelPartners[currPartnerIndex] = {
                            ...channelPartners[currPartnerIndex],
                            ownPermissions: permissions,
                            ownRoles: updatedUser.roles,
                        };
                        this.store.dispatch(cpActions.setChannelPartners({ channelPartners }));
                        this.router.navigate([
                            'home',
                            'channelPartners',
                            this.currentPartner$$().id,
                        ]);
                    }
                });
        } else {
            const folder = user?.groupRoles?.[0]?.groupId || '';
            this.orgUsersStore.updateUser(this.currentOrg$$().id, folder, user.email, roleId);
        }
    }

    showRole(row: UserRecord): boolean {
        const currentGroupId = this.currentGroupId$$();
        const orgId = this.currentOrg$$()?.id;
        if (!currentGroupId && this.canManageUsers$$()) {
            return this.userIsOnlyAdmin(row);
        }
        return (
            (this.userType !== UserType.CHANNEL_PARTNER &&
                currentGroupId !== orgId &&
                row?.accessLevel?.id !== currentGroupId) ||
            this.hasMultipleRoles(row) ||
            !this.canManageUsers$$()
        );
    }

    userIsOnlyAdmin(row: UserRecord): boolean {
        if (!row.roles?.length || this.userType !== UserType.CHANNEL_PARTNER) {
            return false;
        }
        return row.roles[0].includes('Administrator') && this.hasOnlyOneAdmin$$();
    }

    get tableType(): string {
        if (this.accessTable) {
            return 'access-table';
        }
        return this.userType === UserType.CHANNEL_PARTNER ? 'CP-users' : 'org-users';
    }

    findAdmins(records: UserRecord[]): void {
        let adminCount = 0;
        for (const record of records) {
            if (record.roles?.includes('Administrator')) {
                adminCount += 1;
                if (adminCount === 2) {
                    this.hasOnlyOneAdmin$$.set(false);
                    return;
                }
            }
        }
        this.hasOnlyOneAdmin$$.set(true);
    }

    newUserDialog = (): void => {
        this.onAdduser.emit();
    };

    sortUsers(): void {
        // Temporary as unsure how this should sort the users
        this.records = [...structuredClone(this.records).reverse()];
    }

    protected readonly PAGE_PLACEHOLDER = PAGE_PLACEHOLDER;
}
