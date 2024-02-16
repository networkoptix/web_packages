import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { NxMenuService } from '@menu/menu.service';

@Component({
    selector: 'nx-arch-svg',
    templateUrl: 'arch-svg.component.html',
    styleUrls: ['arch-svg.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class NxArchSvgComponent implements OnInit {
    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.selectedSection$$.set('components');
        this.menuService.selectedDetailsSection$$.set('archsvg');
    }
}
