import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { NxMenuService } from '@menu/menu.service';

@Component({
    selector: 'nx-colors',
    templateUrl: 'colors.component.html',
    styleUrls: ['colors.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class NxBasicColorsComponent implements OnInit {
    red = [
        { name: '$red_l2', hex: '#f02c2c' },
        { name: '$red_l1', hex: '#d92a2a' },
        { name: '$red_main', hex: '#c22626' },
        { name: '$red_d1', hex: '#aa1e1e' },
        { name: '$red_d2', hex: '#8e1717' },
        { name: '$red_d3', hex: '#741414' },
        { name: '$red_d4', hex: '#5e1010' },
        { name: '$red_d5', hex: '#480d0d' },
        { name: '$red_d6', hex: '#330909' },
        { name: '$red_d7', hex: '#1d0505' },
    ];

    green = [
        { name: '$green2', hex: '#DFF0D8' },
        { name: '$green1', hex: '#C2E1B5' },
        { name: '$green_l4', hex: '#56E829' },
        { name: '$green_l3', hex: '#51D22A' },
        { name: '$green_l2', hex: '#4CBC28' },
        { name: '$green_l1', hex: '#44A624' },
        { name: '$green_main', hex: '#3A911E' },
        { name: '$green_d1', hex: '#32731E' },
        { name: '$green_d2', hex: '#2A551E' },
        { name: '$green_d3', hex: '#223925' },
    ];

    dark = [
        { name: '$dark1', hex: '#000000' },
        { name: '$dark2', hex: '#080707' },
        { name: '$dark3', hex: '#0D0E0F' },
        { name: '$dark4', hex: '#121517' },
        { name: '$dark5', hex: '#171C1F' },
        { name: '$dark6', hex: '#1C2327' },
        { name: '$dark7', hex: '#212A2F' },
        { name: '$dark8', hex: '#263137' },
        { name: '$dark9', hex: '#2B383F' },
        { name: '$dark10', hex: '#303F47' },
        { name: '$dark11', hex: '#35464F' },
        { name: '$dark12', hex: '#3A4D57' },
        { name: '$dark13', hex: '#3F545F' },
        { name: '$dark14', hex: '#445B67' },
        { name: '$dark15', hex: '#49626F' },
        { name: '$dark16', hex: '#4E6977' },
        { name: '$dark17', hex: '#53707F' },
        { name: '$dark18', hex: '#587785' },
    ];

    light = [
        { name: '$light1', hex: '#FFFFFF' },
        { name: '$light2', hex: '#F5F7F8' },
        { name: '$light3', hex: '#EBEFF1' },
        { name: '$light4', hex: '#E1E7EA' },
        { name: '$light5', hex: '#D7DFE3' },
        { name: '$light6', hex: '#CDD7DC' },
        { name: '$light7', hex: '#C3CFD5' },
        { name: '$light8', hex: '#B9C7CE' },
        { name: '$light9', hex: '#AFBFC7' },
        { name: '$light10', hex: '#A5B7C0' },
        { name: '$light11', hex: '#9BAFB9' },
        { name: '$light12', hex: '#91A7B2' },
        { name: '$light13', hex: '#879FAB' },
        { name: '$light14', hex: '#7D97A4' },
        { name: '$light15', hex: '#738F9D' },
        { name: '$light16', hex: '#698796' },
        { name: '$light17', hex: '#5F7F8F' },
    ];

    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.selectedSection$$.set('colors');
        this.menuService.selectedDetailsSection$$.set('basicColors');
    }
}
