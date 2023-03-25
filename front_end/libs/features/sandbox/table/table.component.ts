import { Component } from '@angular/core';

import { NxMenuService } from '@app/menu/menu.service';
import { icons } from '@lib/variables/static-variables';

@Component({
    selector: 'sandbox-table',
    templateUrl: 'table.component.html',
    styleUrls: ['table.component.scss'],
})
export class TableComponent {
    records: Record<string, string | boolean | Record<string, string>[]>[];
    subLevels: boolean = false;
    expandRowId: string;
    icons = icons;

    constructor(
        private menuService: NxMenuService
    ) {
    }

    ngOnInit(): void {
        this.menuService.section = 'components';
        this.menuService.detail = 'table';

        this.records = [
            {
                id: '1',
                email: 'abc1@networkoptix.com',
                fullName: 'Tsanko',
                accessLevel: [
                    { id: '123', name: 'Chase' },
                    { id: '124', name: 'Citi' }
                ],
                group: [
                    { id: '1', name: 'Administrator' },
                    { id: '2', name: 'Manager' }
                ],
                selected: false
            },
            {
                id: '2',
                email: 'abc2@networkoptix.com',
                fullName: 'Nick',
                accessLevel: [{ id: '124', name: 'Citi' }],
                group: [
                    { id: '1', name: 'Administrator' },
                    { id: '2', name: 'Manager' }
                ],
                selected: false
            },
            {
                id: '3',
                email: 'abc3@networkoptix.com',
                fullName: 'Roman',
                accessLevel: [{ id: '124', name: 'Citi' }],
                group: [
                    { id: '2', name: 'Manager' }
                ],
                selected: false
            },
            {
                id: '4',
                email: 'abc4@networkoptix.com',
                fullName: 'Illya',
                accessLevel: [{ id: '124', name: 'Citi' }],
                group: [
                    { id: '2', name: 'Manager' }
                ],
                selected: false
            },
            {
                id: '5',
                email: 'abc5@networkoptix.com',
                fullName: 'Andrew',
                accessLevel: [{ id: '124', name: 'Citi' }],
                group: [
                    { id: '2', name: 'Manager' }
                ],
                selected: false
            },
            {
                id: '6',
                email: 'abc6@networkoptix.com',
                fullName: 'Connie',
                accessLevel: [{ id: '124', name: 'Citi' }],
                group: [
                    { id: '1', name: 'Administrator' },
                    { id: '2', name: 'Manager' }
                ],
                selected: false
            },
            {
                id: '7',
                email: 'abc7@networkoptix.com',
                fullName: 'Olga',
                accessLevel: [{ id: '125', name: 'BOOM!' }],
                group: [
                    { id: '2', name: 'Manager' }
                ],
                selected: false
            }
        ];
    }

    expandRow(id: string): void {
        if (!this.subLevels) {
            return;
        }
        this.expandRowId = this.expandRowId && this.expandRowId === id
            ? ''
            : id; // toggle
    }

    showSubLevels(state: boolean): void {
        this.subLevels = state;
        if (!state) {
            this.expandRowId = '';
        }
    }

    selectAll(): void {

    }

    selectRecord(rec: Record<string, string>): void {

    }
}
