import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { NxMenuService } from '@menu/menu.service';

@Component({
    selector: 'masonry-grid',
    templateUrl: 'masonry-grid.component.html',
    styleUrls: ['masonry-grid.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class MasonryGridComponent {
    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.selectedSection$$.set('components');
        this.menuService.selectedDetailsSection$$.set('masonryGrid');
    }
}
