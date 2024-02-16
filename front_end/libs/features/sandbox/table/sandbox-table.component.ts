import { Component, ElementRef, ViewChild } from '@angular/core';

import { Size } from '@directives/resize/nx-resize.directive.types';
import staticLang from '@language/language_i18n_static.json';
import { NxMenuService } from '@menu/menu.service';
import {
    UserRecord,
    UserType,
} from '@pages/home/components/users/channel-partner-users/channel-partner-users.types';
import { HEADER_ITEM } from '@pages/home/home.types';
import { icons } from '@static-variables';

@Component({
    selector: 'sandbox-table',
    templateUrl: 'sandbox-table.component.html',
    styleUrls: ['sandbox-table.component.scss'],
})
export class SandboxTableComponent {
    UserType = UserType;
    order: Record<string, number>;
    headers: HEADER_ITEM[];
    records: UserRecord[];
    subLevels: boolean = false;
    expandRowId: string;
    icons = icons;
    tableHeight: number;

    rowsPerPage: Array<number>;

    LANG = staticLang;

    @ViewChild('tableContainer', { static: false })
    private tableContainer: ElementRef<HTMLDivElement>;

    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.selectedSection$$.set('components');
        this.menuService.selectedDetailsSection$$.set('table');

        this.rowsPerPage = [5, 10, 20, 50];

        this.headers = [
            {
                name: 'email',
                value: this.LANG.channelPartners.usersTableHeaders.login,
                sort: 'string',
            },
            {
                name: 'fullName',
                value: this.LANG.channelPartners.usersTableHeaders.fullName,
                sort: 'string',
            },
            { name: 'accessLevel', value: this.LANG.channelPartners.usersTableHeaders.accessLevel },
            { name: 'groups', value: this.LANG.channelPartners.usersTableHeaders.groups },
        ];

        const records: UserRecord[] = [];
        for (let i = 0; i < 15; i++) {
            records.push({
                userId: `abc${i}@networkoptix.com`,
                email: `abc${i}@networkoptix.com`,
                fullName: 'N/A',
                roles: ['Administrator', 'Manager'],
                userType: UserType.CHANNEL_PARTNER,
            });
        }
        this.records = records;
    }

    onResize(event: Size): void {
        if (event.height > 0 && this.tableContainer?.nativeElement) {
            this.tableHeight = this.tableContainer.nativeElement.clientHeight;
        }
    }

    expandRow(userId: string): void {
        if (!this.subLevels) {
            return;
        }
        this.expandRowId = this.expandRowId && this.expandRowId === userId ? '' : userId; // toggle
    }

    showSubLevels(state: boolean): void {
        this.subLevels = state;
        if (!state) {
            this.expandRowId = '';
        }
    }

    selectAll(): void {}

    selectRecord(rec: Record<string, string>): void {}
}
