import { NgFor } from '@angular/common';
import { Component } from '@angular/core';

type Service = {
    name: string;
};
@Component({
    selector: 'nx-organization-reports',
    templateUrl: 'reports.component.html',
    styleUrls: [
        'reports.component.scss',
        '../groups-cards/groups-cards.component.scss',
        '../system-card/system-card.component.scss',
    ],
    standalone: true,
    imports: [NgFor],
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
