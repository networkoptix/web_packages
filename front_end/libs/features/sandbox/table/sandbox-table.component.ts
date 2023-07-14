import { Component } from '@angular/core';

import { icons } from '@lib/variables/static-variables';
import { NxMenuService } from '@menu/menu.service';

@Component({
    selector: 'sandbox-table',
    templateUrl: 'sandbox-table.component.html',
    styleUrls: ['sandbox-table.component.scss'],
})
export class SandboxTableComponent {
    order: Record<string, number>;
    headers: Record<string, Record<string, number | string>>;
    records: Record<string, string | boolean | Record<string, string>[]>[];
    subLevels: boolean = false;
    expandRowId: string;
    icons = icons;

    rowsPerPage: Array<number>;

    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.selectedSection.set('components');
        this.menuService.selectedDetailsSection.set('table');

        this.rowsPerPage = [5, 10, 20, 50];

        this.headers = {
            login: {
                name: 'Login',
                order: 1,
            },
            fullName: {
                name: 'Full Name',
                order: 2,
            },
            accessLevel: {
                name: 'Access Level',
                order: 3,
            },
            groups: {
                name: 'Groups',
                order: 4,
            },
        };

        this.records = [
            {
                id: '1',
                login: 'abc1@networkoptix.com',
                fullName: 'Tsanko',
                accessLevel: [
                    { id: '123', name: 'Chase' },
                    { id: '124', name: 'Citi' },
                ],
                group: [
                    { id: '1', name: 'Administrator' },
                    { id: '2', name: 'Manager' },
                ],
                selected: false,
            },
            {
                id: '2',
                login: 'abc2@networkoptix.com',
                fullName: 'Nick',
                accessLevel: [{ id: '124', name: 'Citi' }],
                group: [
                    { id: '1', name: 'Administrator' },
                    { id: '2', name: 'Manager' },
                ],
                selected: false,
            },
            {
                id: '3',
                login: 'abc3@networkoptix.com',
                fullName: 'Roman',
                accessLevel: [{ id: '124', name: 'Citi' }],
                group: [{ id: '2', name: 'Manager' }],
                selected: false,
            },
            {
                id: '4',
                login: 'abc4@networkoptix.com',
                fullName: 'Illya',
                accessLevel: [{ id: '124', name: 'Citi' }],
                group: [{ id: '2', name: 'Manager' }],
                selected: false,
            },
            {
                id: '5',
                login: 'abc5@networkoptix.com',
                fullName: 'Andrew',
                accessLevel: [{ id: '124', name: 'Citi' }],
                group: [{ id: '2', name: 'Manager' }],
                selected: false,
            },
            {
                id: '6',
                login: 'abc6@networkoptix.com',
                fullName: 'Connie',
                accessLevel: [{ id: '124', name: 'Citi' }],
                group: [
                    { id: '1', name: 'Administrator' },
                    { id: '2', name: 'Manager' },
                ],
                selected: false,
            },
            {
                id: '7',
                login: 'abc7@networkoptix.com',
                fullName: 'Olga',
                accessLevel: [{ id: '125', name: 'BOOM!' }],
                group: [{ id: '2', name: 'Manager' }],
                selected: false,
            },
        ];
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
