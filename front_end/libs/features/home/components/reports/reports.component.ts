import { NgFor } from '@angular/common';
import { Component } from '@angular/core';

import { icons } from '@static-variables';

import { NxCardComponent } from '../card/card.component';

type Service = {
    name: string;
};
@Component({
    selector: 'nx-organization-reports',
    templateUrl: 'reports.component.html',
    styleUrls: [
        'reports.component.scss',
        '../../organizations/cards-container/org-cards-container.component.scss',
        '../system-card/system-card.component.scss',
    ],
    standalone: true,
    imports: [NgFor, NxCardComponent],
})
export class NxOrganizationReportsComponent {
    services = [
        {
            name: 'Health Monitoring',
            icon: 'donut_chart.svg',
        },
        {
            name: 'Paid Services',
            icon: 'bar_chart.svg',
        },
    ];

    dropddownItems = [{ name: 'Item 1', action: null }];

    handleServiceClick = (service: Service): void => {};
    protected readonly icons = icons;
}
