import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxOrgStepSelectComponent } from '@dialogs/channel-partners/add-org-user-v2/org-step-select/org-step-select.component';
import { NxOrgTreeSelectorComponent } from '@dialogs/channel-partners/org-tree-selector/org-tree-selector.component';
import type { OrgTreeStatusMap } from '@dialogs/channel-partners/org-tree-selector/org-tree-selector.types';
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
                            // {
                            //     id: 'North America Id',
                            //     name: 'North America',
                            //     children: [{ id: 'USA Id', name: 'USA', children: [] }],
                            // },
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
                            // { id: 'Ganymede Id', name: 'Ganymede', children: [] },
                            // { id: 'Callisto Id', name: 'Callisto', children: [] },
                            // { id: 'Io Id', name: 'Io', children: [] },
                            // { id: 'Europa Id', name: 'Europa', children: [] },
                        ],
                    },
                    {
                        id: 'Saturn Id',
                        name: 'Saturn',
                        children: [
                            // { id: 'Titan Id', name: 'Titan', children: [] },
                            // { id: 'Rhea Id', name: 'Rhea', children: [] },
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

const dummyOrg2 = {
    id: 'HotDetective',
    name: 'HotDetectiveSolderingHippoRobotKitten',
} as Organization;

const dummyGroups2 = [
    {
        id: 'WittySlogan',
        name: 'WittySloganFollowerMossBandedCourage',
        children: [
            {
                id: 'UnsavoryDynamo',
                name: 'UnsavoryDynamoChatterboxGhostChatterboxGhost',
                children: [
                    {
                        id: 'PandaAlert',
                        name: 'PandaAlertIntuitiveHunterRational',
                        children: [],
                    },
                    {
                        id: 'BrainstormWanderer',
                        name: 'BrainstormWandererMusicianBindRiderFlare',
                        children: [
                            {
                                id: 'FellowHumane',
                                name: 'FellowHumaneCrispCityscapeInfiniteCheer',
                                children: [
                                    {
                                        id: 'DreamingGlow',
                                        name: 'DreamingGlowQuirkyLavenderNinjaBlemish',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'AthleticGarden',
        name: 'AthleticGarden',
        children: [],
    },
    {
        id: 'SizzlingMentor',
        name: 'SizzlingMentor',
        children: [],
    },
    {
        id: 'InsurgentEcho',
        name: 'InsurgentEcho',
        children: [],
    },
    {
        id: 'SavoryTuber',
        name: 'SavoryTuber',
        children: [],
    },
    {
        id: 'DaringCapitalist',
        name: 'DaringCapitalist',
        children: [] as GroupItem[],
    },
] as GroupItem[];

@Component({
    selector: 'nx-offline-data',
    templateUrl: 'offline-data.component.html',
    styleUrls: ['offline-data.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, NxOrgTreeSelectorComponent, NxOrgStepSelectComponent],
})
export class NxCpOfflineDataComponent {
    organization = dummyOrg;
    groups = dummyGroups;
    statuses: OrgTreeStatusMap = new Map([
        ['Solar System Id', { status: 'warn', msg: 'Red giant transition at 50%' }],
        ['Inner solar system Id', { status: 'warn', msg: 'Uh-oh! SpaghettiOs' }],
        ['Mars Id', { status: 'warn', msg: 'Terraforming in progress' }],
        ['Kuiper belt Id', { status: 'disable', msg: 'Population limit reached' }],
        ['Pluto Id', { status: 'disable', msg: 'Population limit reached' }],
        ['Eris Id', { status: 'disable', msg: 'Population limit reached' }],
    ]);

    org2 = dummyOrg2;
    groups2 = dummyGroups2;
    statuses2: OrgTreeStatusMap = new Map([
        ['WittySlogan', { status: 'warn', msg: 'Warning message' }],
        ['UnsavoryDynamo', { status: 'warn', msg: 'Warning message' }],
        ['PandaAlert', { status: 'warn', msg: 'Warning message' }],
        ['BrainstormWanderer', { status: 'warn', msg: 'Warning message' }],
        ['FellowHumane', { status: 'warn', msg: 'Warning message' }],
        ['DreamingGlow', { status: 'warn', msg: 'Warning message' }],
    ]);

    paths = [
        ['A', 'B', 'C', 'D', 'E'],
        ['AthleticGarden', 'SizzlingMentor'],
        [
            'HotDetectiveSolderingHippoRobotKittenWittySloganFollowerMossBandedCourage',
            'SavoryTuber',
        ],
        [
            'HotDetectiveSolderingHippoRobotKittenWittySloganFollowerMossBandedCourage',
            'SavoryTuber',
            'DaringCapitalist',
        ],
        ['HotDetectiveSolderingHippoRobotKittenWittySloganFollowerMossBandedCourage'],
        [
            'HotDetectiveSolderingHippoRobotKitten',
            'WittySloganFollowerMossBandedCourageUnsavoryDynamoChatterboxGhostChatterboxGhost',
        ],
        [
            'HotDetectiveSolderingHippoRobotKitten',
            'WittySloganFollowerMossBandedCourage',
            'UnsavoryDynamoChatterboxGhostChatterboxGhost',
        ],

        [
            'HotDetective SolderingHippo RobotKitten WittySlogan FollowerMoss BandedCourage',
            'SavoryTuber',
        ],
        [
            'HotDetective SolderingHippo RobotKitten WittySlogan FollowerMoss BandedCourage',
            'SavoryTuber',
            'DaringCapitalist',
        ],
        ['HotDetective SolderingHippo RobotKitten WittySlogan FollowerMoss BandedCourage'],
        [
            'HotDetective SolderingHippo RobotKitten',
            'WittySlogan FollowerMoss BandedCourage UnsavoryDynamo ChatterboxGhost ChatterboxGhost',
        ],
        [
            'HotDetective SolderingHippo RobotKitten',
            'WittySlogan FollowerMoss BandedCourage',
            'UnsavoryDynamo ChatterboxGhost ChatterboxGhost',
        ],
    ];
}
