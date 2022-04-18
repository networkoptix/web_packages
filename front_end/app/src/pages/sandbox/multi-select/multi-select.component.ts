import { Component } from '@angular/core';

import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import { NxMenuService } from '@src/menu/menu.service';

@Component({
    selector: 'multi-select',
    templateUrl: 'multi-select.component.html',
    styleUrls: ['multi-select.component.scss']
})
export class MultiSelectComponent {
    items: any[];
    itemsSelected: any;
    mode: DropdownItem<string>[];
    modeSelected: DropdownItem<string>;
    ddWidth: number;

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
            { label: 'Live Viewer', id: 'qwerty4' }
            // { label: 'Administrator', id: 'qwerty11' },
            // { label: 'Advanced Viewer', id: 'qwerty12' },
            // { label: 'Viewer', id: 'qwerty13' },
            // { label: 'Live Viewer', id: 'qwerty14' },
            // { label: 'Administrator', id: 'qwerty21' },
            // { label: 'Advanced Viewer', id: 'qwerty22' },
            // { label: 'Viewer', id: 'qwerty23' },
            // { label: 'Live Viewer', id: 'qwerty24' },
        ];

        this.itemsSelected = ['qwerty2', 'qwerty3'];

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

    modelChanged(result: any): void {
        // ensure 'change' will be triggered
        this.itemsSelected = [...result];
    }
}
