import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxOrgTreeSelectorComponent } from '@dialogs/channel-partners/org-tree-selector/org-tree-selector.component';
import { OrgTreeStatuses } from '@dialogs/channel-partners/org-tree-selector/org-tree-selector.types';
import type {
    GroupItem,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

const dummyOrg = {
    id: 'Solar System Id',
    name: 'Solar System',
} as Organization;

const dummyGroups = [
    {
        id: 'Inner solar system Id',
        name: 'Inner solar system',
        children: [
            {
                id: 'Inner planets Id',
                name: 'Inner planets',
                children: [
                    { id: 'Venus Id', name: 'Venus', children: [] },
                    {
                        id: 'Earth Id',
                        name: 'Earth',
                        children: [
                            {
                                id: 'North America Id',
                                name: 'North America',
                                children: [{ id: 'USA Id', name: 'USA', children: [] }],
                            },
                        ],
                    },
                    { id: 'Mars Id', name: 'Mars', children: [] },
                ],
            },
            {
                id: 'Asteroid belt Id',
                name: 'Asteroid belt',
                children: [{ id: 'Pallas Id', name: 'Pallas', children: [] }],
            },
        ],
    },
    {
        id: 'Outer solar system Id',
        name: 'Outer solar system',
        children: [
            {
                id: 'Outer planets Id',
                name: 'Outer planets',
                children: [
                    {
                        id: 'Jupiter Id',
                        name: 'Jupiter',
                        children: [
                            { id: 'Ganymede Id', name: 'Ganymede', children: [] },
                            { id: 'Callisto Id', name: 'Callisto', children: [] },
                            { id: 'Io Id', name: 'Io', children: [] },
                            { id: 'Europa Id', name: 'Europa', children: [] },
                        ],
                    },
                    {
                        id: 'Saturn Id',
                        name: 'Saturn',
                        children: [
                            { id: 'Titan Id', name: 'Titan', children: [] },
                            { id: 'Rhea Id', name: 'Rhea', children: [] },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'Kuiper belt Id',
        name: 'Kuiper belt',
        children: [
            { id: 'Pluto Id', name: 'Pluto', children: [] },
            { id: 'Eris Id', name: 'Eris', children: [] as GroupItem[] },
            // Bad interaction with empty array type
        ],
    },
    // { id: 'Planet 9 Id', name: 'Planet 9', children: [] },
] as GroupItem[];

const dummyStatuses = new Map([
    ['Mars Id', { type: 'warn', msg: 'Terraforming in progress' }],
    ['Ganymede Id', { type: 'error', msg: 'Population limit reached' }],
    ['Inner solar system Id', { type: 'warn', msg: 'Uh-oh! SpaghettiOs' }],
]) as OrgTreeStatuses;
@Component({
    selector: 'nx-offline-data',
    templateUrl: 'offline-data.component.html',
    styleUrls: ['offline-data.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule, NxOrgTreeSelectorComponent],
})
export class NxCpOfflineDataComponent {
    organization = dummyOrg;
    groups = dummyGroups;
    statuses = dummyStatuses;
}
