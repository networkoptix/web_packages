import { Component } from '@angular/core';

import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import type {
    MultiSelectItem
} from '@components/dropdowns/multi-select/multi-select.component.types';
import { NxMenuService } from '@src/menu/menu.service';

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

    constructor(
        private menuService: NxMenuService,
    ) {}

    ngOnInit(): void {
        this.menuService.section = 'components';
        this.menuService.detail = 'multiSelect';

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

        this.selectedDDItem = { value: '0', name: 'All' };

        this.mode = [
            { name: 'Main', value: 'qwerty2' },
            { name: 'Backup', value: 'qwerty3' },
            { name: 'Not in use', value: 'qwerty4' }
        ];

        this.modeSelected = this.mode[2];

        // calculate dd size
        const btn = document.createElement('span');
        btn.style.visibility = 'hidden';
        btn.innerText = this.modeSelected.name;
        document.body.appendChild(btn);
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
}
