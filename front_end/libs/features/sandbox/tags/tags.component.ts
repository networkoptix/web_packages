import { Component, ViewEncapsulation } from '@angular/core';

import { NxMenuService } from '@menu/menu.service';

@Component({
    selector: 'tags',
    templateUrl: 'tags.component.html',
    styleUrls: ['tags.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class TagsComponent {
    options: { name: string; selected: boolean; type?: string }[];

    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.selectedSection.set('components');
        this.menuService.selectedDetailsSection.set('tags');

        this.options = [
            { name: 'brand', selected: false, type: 'brand' },
            { name: 'really long name break', selected: false, type: 'brand' },
            { name: 'success', selected: false, type: 'success' },
            { name: 'danger', selected: false, type: 'danger' },
            { name: 'warning', selected: false, type: 'warning' },
            { name: 'info', selected: false, type: 'info' },
            { name: 'default', selected: false },
        ];
    }
}
