import { Component, Input } from '@angular/core';

import staticLang from '@app/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import { ChannelPartnerUser } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@Component({
    selector: 'nx-users-table',
    templateUrl: 'users-table.component.html',
    styleUrls: ['users-table.component.scss'],
})
export class NxUsersTableComponent {
    @Input() headers: Record<string, Record<string, number | string>>;
    @Input() records: ChannelPartnerUser[];

    LANG = staticLang;

    // headers: Record<string, Record<string, number | string>>;
    // records: Record<string, string | boolean | Record<string, string>[]>[];
    subLevels: boolean = false;
    expandRowId: string;
    icons = icons;

    rowsPerPage: Array<number>;

    // constructor() {}

    ngOnInit(): void {
        this.rowsPerPage = [5, 10, 20, 50];
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

    selectRecord(rec: Record<string, string>): void {}
}
