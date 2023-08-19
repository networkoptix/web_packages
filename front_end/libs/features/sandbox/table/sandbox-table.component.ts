import { Component, ElementRef, ViewChild } from '@angular/core';

import { Size } from '@directives/resize/nx-resize.directive.types';
import staticLang from '@language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import { NxMenuService } from '@menu/menu.service';
import { HEADER_ITEM } from '@pages/home/home.types';
import { ChannelPartnerUserExt } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@Component({
    selector: 'sandbox-table',
    templateUrl: 'sandbox-table.component.html',
    styleUrls: ['sandbox-table.component.scss'],
})
export class SandboxTableComponent {
    order: Record<string, number>;
    headers: HEADER_ITEM[];
    records: ChannelPartnerUserExt[];
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
        this.menuService.selectedSection.set('components');
        this.menuService.selectedDetailsSection.set('table');

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

        this.records = [
            {
                userId: 'abc1@networkoptix.com',
                email: 'abc1@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
            {
                userId: 'abc2@networkoptix.com',
                email: 'abc2@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
            {
                userId: 'abc3@networkoptix.com',
                email: 'abc3@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
            {
                userId: 'abc4@networkoptix.com',
                email: 'abc4@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
            {
                userId: 'abc5@networkoptix.com',
                email: 'abc5@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
            {
                userId: 'abc6@networkoptix.com',
                email: 'abc6@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
            {
                userId: 'abc7@networkoptix.com',
                email: 'abc7@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
            {
                userId: 'abc8@networkoptix.com',
                email: 'abc8@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
            {
                userId: 'abc9@networkoptix.com',
                email: 'abc9@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
            {
                userId: 'abc10@networkoptix.com',
                email: 'abc10@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
            {
                userId: 'abc11@networkoptix.com',
                email: 'abc11@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
            {
                userId: 'abc12@networkoptix.com',
                email: 'abc12@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
            {
                userId: 'abc13@networkoptix.com',
                email: 'abc13@networkoptix.com',
                fullName: 'N/A',
                accessLevel: ['N/A'],
                roles: ['Administrator', 'Manager'],
            },
        ];
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
