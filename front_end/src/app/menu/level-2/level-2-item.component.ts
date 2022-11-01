import { Component, Input, OnInit } from '@angular/core';

import type { Level2Item } from '../menu.types';

/* Usage
 */

@Component({
    selector: 'nx-level-2-item',
    templateUrl: 'level-2-item.component.html',
    styleUrls: ['level-2-item.component.scss']
})
export class NxLevel2ItemComponent implements OnInit {
    @Input() base: string = '';
    @Input() item: Level2Item;
    @Input() selected: boolean;

    itemPath: string;

    ngOnInit(): void {
        this.itemPath = this.base;
        this.itemPath += (this.item.path !== '') ? `/${this.item.path}` : '';
    }
}
