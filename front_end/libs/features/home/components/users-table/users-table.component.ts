import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language/language_i18n_static.json';
import { HEADER_ITEM } from '@pages/home/home.types';
import { selectCurrentOrganization } from '@pages/home/store/channel-partners/channel-partners.selectors';
import { selectCurrentGroupId } from '@pages/home/store/groups/groups.selectors';
import { GroupRole } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
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
    ],
})
export class NxUsersTableComponent {
    UserType = UserType;
    currentGroupId$$ = this.store.selectSignal(selectCurrentGroupId);
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);

    @Input({ transform: booleanAttribute }) inGroup: boolean;
    @Input({ required: true }) userType: UserType;
    @Input() headers: HEADER_ITEM[];
    @Input() records: UserRecord[];
    @Input() selectedRecordId: string = '';

    @Output() public onDeleteClick = new EventEmitter<UserRecord>();
    @Output() public onRowClick = new EventEmitter<UserRecord>();

    LANG = staticLang;

    // headers: Record<string, Record<string, number | string>>;
    // records: Record<string, string | boolean | Record<string, string>[]>[];
    subLevels: boolean = false;
    expandRowId: string;
    icons = icons;

    setHeaders: Array<string>;
    rowsPerPage: Array<number>;

    public idPropName = 'userId';

    constructor(private store: Store) {}

    ngOnInit(): void {
        this.rowsPerPage = [5, 10, 20, 50];
        this.setHeaders = ['userId', 'email', 'fullName', 'accessLevel', 'roles', 'delete'];
        if (this.userType === UserType.CHANNEL_PARTNER) {
            this.setHeaders.splice(3, 1);
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

    selectAll(): void {}

    selectRecord(rec: UserRecord): void {}

    onRowClickAction(rec: UserRecord): void {
        this.onRowClick.emit({ ...rec });
    }

    getRoles(groupRoles: GroupRole[]): string {
        const roles: { [key: string]: boolean } = {};
        for (const group of groupRoles) {
            for (const role of group.roles) {
                roles[role] = true;
            }
        }
        const rolesList = Object.keys(roles);
        return rolesList.length > 1 ? 'Multiple' : rolesList[0];
    }
}
