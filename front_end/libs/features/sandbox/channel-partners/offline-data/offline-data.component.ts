import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxOrgTreeSelectorComponent } from '@dialogs/channel-partners/org-tree-selector/org-tree-selector.component';
import type { OrgTreeStatusValue } from '@dialogs/channel-partners/org-tree-selector/org-tree-selector.types';
import { NxOrgTreeSelectorV0Component } from '@dialogs/channel-partners/org-tree-selector-v0/org-tree-selector.component';
import { OrgTreeStatuses } from '@dialogs/channel-partners/org-tree-selector-v0/org-tree-selector.types';
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

@Component({
    selector: 'nx-offline-data',
    templateUrl: 'offline-data.component.html',
    styleUrls: ['offline-data.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        NxOrgTreeSelectorV0Component,
        NxOrgTreeSelectorComponent,
    ],
})
export class NxCpOfflineDataComponent {
    organization = dummyOrg;
    groups = dummyGroups;
    statuses = new Map([
        ['Solar System Id', { type: 'warn', msg: 'Red giant transition at 50%' }],
        ['Inner solar system Id', { type: 'warn', msg: 'Uh-oh! SpaghettiOs' }],
        ['Mars Id', { type: 'warn', msg: 'Terraforming in progress' }],
        ['Kuiper belt Id', { type: 'error', msg: 'Population limit reached' }],
        ['Pluto Id', { type: 'error', msg: 'Population limit reached' }],
        ['Eris Id', { type: 'error', msg: 'Population limit reached' }],
    ]) as OrgTreeStatuses;
    statuses2 = new Map<string, OrgTreeStatusValue>([
        ['Solar System Id', { status: 'warn', msg: 'Red giant transition at 50%' }],
        ['Inner solar system Id', { status: 'warn', msg: 'Uh-oh! SpaghettiOs' }],
        ['Mars Id', { status: 'warn', msg: 'Terraforming in progress' }],
        ['Kuiper belt Id', { status: 'disable', msg: 'Population limit reached' }],
        ['Pluto Id', { status: 'disable', msg: 'Population limit reached' }],
        ['Eris Id', { status: 'disable', msg: 'Population limit reached' }],
    ]);
}
