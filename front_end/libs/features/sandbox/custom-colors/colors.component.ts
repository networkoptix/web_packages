import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { NxMenuService } from '@menu/menu.service';

@Component({
    selector: 'nx-custom-colors',
    templateUrl: 'colors.component.html',
    styleUrls: ['colors.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class NxCustomColorsComponent implements OnInit {
    blue = [
        { name: '$brand_contrast', hex: '#FFFFFF' },
        { name: '$brand_l4', hex: '#77D2FF' },
        { name: '$brand_l3', hex: '#5ECBFF' },
        { name: '$brand_l2', hex: '#43C2FF' },
        { name: '$brand_l1', hex: '#39B2EF' },
        { name: '$brand_core', hex: '#2FA2DB' },
        { name: '$brand_d1', hex: '#2592C3' },
        { name: '$brand_d2', hex: '#1B82AD' },
        { name: '$brand_d3', hex: '#117297' },
        { name: '$brand_d4', hex: '#076281' },
        { name: '$brand_d5', hex: '#045773' },
        { name: '$brand_d6', hex: '#054A61' },
        { name: '$brand_d7', hex: '#043E51' },
    ];

    orange = [
        { name: '--brand-contrast: #FFFFFF' },
        { name: '--brand-l4', hex: '#FFBA5F' },
        { name: '--brand-l3', hex: '#FFA947' },
        { name: '--brand-l2', hex: '#FF932A' },
        { name: '--brand-l1', hex: '#FF7D20' },
        { name: '--brand-core', hex: '#FC6C21' },
        { name: '--brand-d1', hex: '#F06200' },
        { name: '--brand-d2', hex: '#DC5900' },
        { name: '--brand-d3', hex: '#C45002' },
        { name: '--brand-d4', hex: '#AB4807' },
        { name: '--brand-d5', hex: '#92410D' },
        { name: '--brand-d6', hex: '#7D3A12' },
        { name: '--brand-d7', hex: '#6B3516' },
    ];

    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.selectedSection$$.set('colors');
        this.menuService.selectedDetailsSection$$.set('customColors');
    }
}
