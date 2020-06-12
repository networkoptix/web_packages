import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { NxHeaderService } from '../../../services/nx-header.service';
import { MenuNode } from '../../dropdowns/drop-menu/navigation-tile/navigation-tile.component';

@Component({
    selector: 'nx-header-tabs',
    templateUrl: './tabs.component.html',
    styleUrls: ['./tabs.component.scss']
})
export class NxTabsComponent implements OnInit {
    @Input() node: MenuNode;
    constructor(public headerService: NxHeaderService) {
    }

    ngOnInit(): void {
    }
}
