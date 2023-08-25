import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import staticLang from '@language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import { HEADER_ITEM } from '@pages/home/home.types';

import type { ChannelPartnerUserExt } from '../users/channel-partner-users/channel-partner-users.types';

@Component({
    selector: 'nx-users-table',
    templateUrl: 'users-table.component.html',
    styleUrls: ['users-table.component.scss'],
    standalone: true,
    imports: [
        AngularSvgIconModule,
        NgFor,
        NgIf,
        NgClass,
        TranslateModule,
        NxCheckboxComponent,
        NxBaseTableComponent,
    ],
})
export class NxUsersTableComponent {
    @Input() headers: HEADER_ITEM[];
    @Input() records: ChannelPartnerUserExt[];
    @Input() selectedRecordId: string;

    @Output() public onRowClick = new EventEmitter<ChannelPartnerUserExt>();

    LANG = staticLang;

    // headers: Record<string, Record<string, number | string>>;
    // records: Record<string, string | boolean | Record<string, string>[]>[];
    subLevels: boolean = false;
    expandRowId: string;
    icons = icons;

    setHeaders: Array<string>;
    rowsPerPage: Array<number>;

    // constructor() {}

    ngOnInit(): void {
        this.rowsPerPage = [5, 10, 20, 50];
        this.setHeaders = ['userId', 'email', 'fullName', 'accessLevel', 'roles'];
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

    selectRecord(rec: ChannelPartnerUserExt): void {}

    onRowClickAction(rec: ChannelPartnerUserExt): void {
        this.onRowClick.emit({ ...rec });
    }
}
