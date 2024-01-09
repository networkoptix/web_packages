import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxDropdownModule } from '@components/dropdownV2/dropdown.module';
import { NxBaseTableComponent } from '@components/table/table.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import staticLang from '@language/language_i18n_static.json';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import {
    selectCurrentOrganization,
    selectCurrentPartner,
} from '@pages/home/store/channel-partners/channel-partners.selectors';
import { selectCurrentGroupId } from '@pages/home/store/groups/groups.selectors';
import {
    ChannelPartnerRole,
    OrganizationRole,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';

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
    ],
})
export class NxUsersTableComponent {
    UserType = UserType;
    currentGroupId$$ = this.store.selectSignal(selectCurrentGroupId);
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    currentPartner$$ = this.store.selectSignal(selectCurrentPartner);

    @Input({ transform: booleanAttribute }) inGroup: boolean;
    @Input({ required: true }) userType: UserType;
    @Input() headers: HEADER_ITEM[];
    @Input() records: UserRecord[];
    @Input() selectedRecordId: string = '';
    @Input() roles: Omit<OrganizationRole[] | ChannelPartnerRole[], 'permissions'> = [];

    @Output() public onDeleteClick = new EventEmitter<UserRecord>();
    @Output() public onRowClick = new EventEmitter<UserRecord>();
    @Output() public onExpandClick = new EventEmitter<UserRecord>();

    LANG = staticLang;

    // headers: Record<string, Record<string, number | string>>;
    // records: Record<string, string | boolean | Record<string, string>[]>[];
    subLevels: boolean = false;
    expandRowId: string;
    icons = icons;
    canManageUsers: boolean;

    setHeaders: Array<string>;
    rowsPerPage: Array<number>;

    public idPropName = 'userId';

    constructor(
        private store: Store,
        private cpService: NxChannelPartnersService,
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
        this.canManageUsers =
            this.userType === UserType.CHANNEL_PARTNER
                ? this.currentPartner$$()?.ownPermissions.includes('manage_users')
                : this.currentOrg$$()?.ownPermissions.includes('manage_users');
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

    selectAll(): void {}

    selectRecord(rec: UserRecord): void {}

    onRowClickAction(rec: UserRecord): void {
        this.onRowClick.emit({ ...rec });
    }

    getDisplayRole(user: UserRecord): string {
        let displayRole = user.roles[0];
        if (!this.inGroup && !user.isOrgUser && user.userType !== UserType.CHANNEL_PARTNER) {
            displayRole = user.groupRoles?.length > 1 ? 'Multiple' : user.groupRoles[0].roles[0];
        }
        return displayRole;
    }

    hasMultipleRoles(user: UserRecord): boolean {
        return user.groupRoles?.length > 1 || user.roles?.length > 1;
    }

    getRowRoleId(user: UserRecord): string {
        return this.roles.find(role => role.name === this.getDisplayRole(user))?.id.toString();
    }

    isUserRole(role: OrganizationRole, user: UserRecord): boolean {
        return role.name === this.getDisplayRole(user);
    }

    updateRole(user: UserRecord, roleId: string): void {
        if (user.isOrgUser) {
            this.cpService
                .updateOrganizationUser(this.currentOrg$$()?.id, { roleId, email: user.email })
                .subscribe();
        } else {
            this.cpService
                .updateGroupUser(user.groupRoles[0].groupId, { roleId, email: user.email })
                .subscribe();
        }
    }
}
