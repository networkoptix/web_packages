import { Component } from '@angular/core';

import { NxMenuService } from '@app/menu/menu.service';

@Component({
    selector: 'masonry-grid',
    templateUrl: 'masonry-grid.component.html',
    styleUrls: ['masonry-grid.component.scss']
})
export class MasonryGridComponent {
    constructor(
        private menuService: NxMenuService,
    ) {}

    ngOnInit(): void {
        this.menuService.section = 'components';
        this.menuService.detail = 'masonryGrid';
    }
}
