import { Component, OnInit } from '@angular/core';

import { NxMenuService } from '@menu/menu.service';

@Component({
    selector: 'nx-arch-svg',
    templateUrl: 'arch-svg.component.html',
    styleUrls: ['arch-svg.component.scss'],
})
export class NxArchSvgComponent implements OnInit {
    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.section = 'components';
        this.menuService.detail = 'archsvg';
    }
}
