import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subscription } from 'rxjs';

import { SystemGroupsDataService } from '@services/system-groups-data.service';

@UntilDestroy()
@Component({
    selector: 'websocket',
    templateUrl: 'websocket.component.html',
    styleUrls: ['websocket.component.scss']
})
export class WebsocketComponent implements OnInit {
    @ViewChild('aggregatorForm', { read: NgForm }) aggregatorForm;
    @ViewChild('groupForm', { read: NgForm }) groupForm;

    aggregate = {
        groupId: '',
        method: 'get',
        url: ''
    };
    group = {
        groupId: '',
        name: '',
        systemId: '',
        targetId: '',
    };

    systems = {};
    systemGroups = {};
    socketData = {};
    websocketSubscription: Subscription;

    constructor(private systemGroupsData: SystemGroupsDataService) {
    }

    ngOnInit(): void {
        this.websocketSubscription = this.systemGroupsData.connect()
            .subscribe(this.handleWebsocketData);
    }

    private handleWebsocketData = socketData => {
        const { action, data } = socketData;
        if (action === 'connected') {
            this.sendGroupAction('systems');
        } else if (action === 'systems') {
            this.systems = data.reduce((_systems, system) => {
                _systems[system.id] = system;
                return _systems;
            }, {});
        } else if (action === 'list') {
            const mapIdsToSystem = groupSystems => groupSystems
                // eslint-disable-next-line no-prototype-builtins
                .filter(({ id }) => this.systems.hasOwnProperty(id))
                .map(system => ({ ...system, ...this.systems[system.id] }));
            const mapGroupsToSystems = groups => groups.map(group => ({
                ...group,
                groups: mapGroupsToSystems(group.groups),
                systems: mapIdsToSystem(group.systems)
            }));
            // eslint-disable-next-line no-prototype-builtins
            this.systemGroups = data.filter(element => element.type === 'group' || this.systems.hasOwnProperty(element.id))
                .map(element => {
                    if (element.type === 'group') {
                        element.groups = mapGroupsToSystems(element.groups);
                        element.systems = mapIdsToSystem(element.systems);
                    } else {
                        element = { ...element, ...this.systems[element.id] };
                    }
                    return element;
                });
        } else {
            this.socketData = data;
        }
    };

    sendGroupAction(action: string): void {
        if (!this.systemGroupsData.connection$) {
            return;
        }
        this.systemGroupsData.send({ action, ...this.group });
    }

    sendAggregateAction(action: string): void {
        if (!this.systemGroupsData.connection$) {
            return;
        }
        this.systemGroupsData.send({ action, ...this.aggregate });
    }
}
