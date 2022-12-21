import { DOCUMENT } from '@angular/common';
import { Component, Inject } from '@angular/core';

import { NxMenuService } from '@app/menu/menu.service';
import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import type {
    MultiSelectItem
} from '@components/dropdowns/multi-select/multi-select.component.types';

@Component({
    selector: 'multi-select',
    templateUrl: 'multi-select.component.html',
    styleUrls: ['multi-select.component.scss']
})
export class MultiSelectComponent {
    items: MultiSelectItem[];
    itemsSelected: string[];
    mode: DropdownItem<string>[];
    modeSelected: DropdownItem<string>;
    ddWidth: number;
    itemsDDSingle: DropdownItem<string>[];
    selectedDDItem: DropdownItem<string>;
    itemsSearchableDDSingle: DropdownItem<string>[];
    selectedSearchableDDItem: DropdownItem<string>;

    constructor(
        private menuService: NxMenuService,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    ngOnInit(): void {
        this.menuService.section = 'components';
        this.menuService.detail = 'dropdowns';

        this.items = [
            { label: 'Administrator', id: 'qwerty1' },
            { label: 'Advanced Viewer', id: 'qwerty2' },
            { label: 'Viewer', id: 'qwerty3' },
            { label: 'Live Viewer', id: 'qwerty4' },
            { label: 'Administrator', id: 'qwerty11' },
            { label: 'Advanced Viewer', id: 'qwerty12' },
            { label: 'Viewer', id: 'qwerty13' },
            { label: 'Live Viewer', id: 'qwerty14' },
            { label: 'Administrator', id: 'qwerty21' },
            { label: 'Advanced Viewer', id: 'qwerty22' },
            { label: 'Viewer', id: 'qwerty23' },
            { label: 'Live Viewer', id: 'qwerty24' },
        ];

        this.itemsSelected = ['qwerty2', 'qwerty3'];

        this.itemsDDSingle = [
            { value: '0', name: 'All' },
            { value: '84480', name: '1CIF' },
            { value: '168960', name: '2CIF' },
            { value: '337920', name: 'D1' },
            { value: '307200', name: 'VGA' },
            { value: '786432', name: 'SVGA' },
            { value: '921600', name: '720p' },
            { value: '1310720', name: '1mp' },
            { value: '2073600', name: '1080p' },
            { value: '1920000', name: '2mp' },
            { value: '3145728', name: '3mp' },
            { value: '4915200', name: '5mp' },
            { value: '8000000', name: '8mp' },
            { value: '10039296', name: '10mp' },
            { value: '15824256', name: '16mp' }
        ];

        // this.selectedDDItem = { value: '0', name: 'All' };
        this.itemsSearchableDDSingle = [
            { value: 'test@test.com', name: 'test@test.com', help: 'Johnny Test' },
            { value: 'test1@test.com', name: 'test1@test.com', help: 'Test Test Test Test Test Test Test' },
            { value: 'test2@test.com', name: 'test2@test.com', help: 'Test 2' },
            { value: 'test3@test.com', name: 'test3@test.com', help: 'Test 3' },
            { value: 'test4@test.com', name: 'test4@test.com', help: 'Test 4' },
            { value: 'test5@test.com', name: 'test5@test.com', help: 'Test 5' },
            { value: 'test6@test.com', name: 'test6@test.com', help: 'Test 6' },
            { value: 'test7@test.com', name: 'test7@test.com', help: 'Test 7' },
            { value: 'test8@test.com', name: 'test8@test.com', help: 'Test 8' },
            { value: 'test9@test.com', name: 'test9@test.com', help: 'Test 9' },
            { value: 'test10@test.com', name: 'test10@test.com', help: 'Test 10' },
            { value: 'test11@test.com', name: 'test11@test.com', help: 'Test 11' },
            { value: 'test12@test.com', name: 'test12@test.com', help: 'Test 12' },
            { value: 'test13@test.com', name: 'test13@test.com', help: 'Test 13' },
            { value: 'test14@test.com', name: 'test14@test.com', help: 'Test 14' },
            { value: 'test15@test.com', name: 'test15@test.com', help: 'Test 15' },
            { value: 'test16@test.com', name: 'test16@test.com', help: 'Test 16' },
            { value: 'test17@test.com', name: 'test17@test.com', help: 'Test 17' },
            { value: 'test18@test.com', name: 'test18@test.com', help: 'Test 18' },
            { value: 'test19@test.com', name: 'test19@test.com', help: 'Test 19' },
            { value: 'test20@test.com', name: 'test20@test.com', help: 'Test 20' },
        ];

        this.mode = [
            { name: 'Main', value: 'qwerty2' },
            { name: 'Backup', value: 'qwerty3' },
            { name: 'Not in use', value: 'qwerty4' }
        ];

        this.modeSelected = this.mode[2];

        // calculate dd size
        const btn = this.document.createElement('span');
        btn.style.visibility = 'hidden';
        btn.innerText = this.modeSelected.name;
        this.document.body.appendChild(btn);
        // add button's left and right padding and space for info icon
        this.ddWidth = Math.round(btn.getBoundingClientRect().width + 100);
    }

    modelChanged(result: string[]): void {
        // ensure 'change' will be triggered
        this.itemsSelected = [...result];
    }

    ddSingleModelChanged(result: DropdownItem<string>): void {
        // ensure 'change' will be triggered
        this.selectedDDItem = { ...result };
    }

    ddSearchableModelChanged(result: DropdownItem<string>): void {
        // ensure 'change' will be triggered
        this.selectedSearchableDDItem = { ...result };
    }
}
