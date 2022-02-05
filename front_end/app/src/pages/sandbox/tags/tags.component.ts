import { Component } from '@angular/core';

import { NxMenuService } from '../../../menu';

@Component({
    selector: 'tags',
    templateUrl: 'tags.component.html',
    styleUrls: ['tags.component.scss']
})
export class TagsComponent {
    options: any;

    constructor(
        private menuService: NxMenuService,
    ) {}

    ngOnInit() {
        this.menuService.section = 'components';
        this.menuService.detail = 'tags';

        this.options = [
            { name: 'brand', selected: false, type: 'brand' },
            { name: 'really long name break', selected: false, type: 'brand' },
            { name: 'success', selected: true, type: 'success' },
            { name: 'danger', selected: true, type: 'danger' },
            { name: 'warning', selected: false, type: 'warning' },
            { name: 'info', selected: false, type: 'info' },
            { name: 'default', selected: true }
        ];
    }
}
