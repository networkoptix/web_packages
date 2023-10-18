import { NgFor } from '@angular/common';
import { Component } from '@angular/core';

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
            name: 'Service Changes',
        },
        {
            name: 'Service Usage',
        },
    ];

    handleServiceClick = (service: Service): void => {};
}
