import { Component } from '@angular/core';

import { NxMenuService } from '@app/menu/menu.service';

@Component({
    selector: 'sandbox-table',
    templateUrl: 'table.component.html',
    styleUrls: ['table.component.scss'],
})
export class TableComponent {
    records: Record<string, string | boolean>[];

    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.section = 'components';
        this.menuService.detail = 'table';

        this.records = [
            { email: 'abc1@networkoptix.com', fullName: 'Tsanko', accessLevel: 'Chase', group: 'Manager', selected: false },
            { email: 'abc2@networkoptix.com', fullName: 'Nick', accessLevel: 'Citi', group: 'Manager', selected: false },
            { email: 'abc3@networkoptix.com', fullName: 'Roman', accessLevel: 'Citi', group: 'Manager', selected: false },
            { email: 'abc4@networkoptix.com', fullName: 'Illya', accessLevel: 'Citi', group: 'Manager', selected: false },
            { email: 'abc5@networkoptix.com', fullName: 'Andrew', accessLevel: 'Citi', group: 'Manager', selected: false },
            { email: 'abc6@networkoptix.com', fullName: 'Connie', accessLevel: 'Citi', group: 'Manager', selected: false },
            { email: 'abc7@networkoptix.com', fullName: 'Olga', accessLevel: 'BOOM!', group: 'Manager', selected: false }
        ];
    }

    selectAll(): void {

    }

    selectRecord(rec: Record<string, string>): void {

    }
}
