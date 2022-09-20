import { ChangeDetectorRef, Component } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import type { NxSystem } from '@services/system.service/system';
import type { NxSystemInfo } from '@services/systems.service.types';

import { FirstPartyWidget } from '../helper-classes';

@UntilDestroy()
@Component({
    selector: 'nx-systems-list-widget',
    templateUrl: './systems-list-widget.component.html',
    styleUrls: ['./systems-list-widget.component.scss']
})
export class NxSystemsListWidgetComponent extends FirstPartyWidget<
    typeof NxSystemsListWidgetComponent.BASE_CONFIG
> {
    static IDENTIFIER = 'systems-list';
    static NAME = 'Systems';
    static SIZES = [
        { name: 'Small', value: { cols: 4, rows: 4 } },
        { name: 'Medium', value: { cols: 8, rows: 4 } },
        { name: 'Large', value: { cols: 16, rows: 4 } }
    ];

    static SELECTED_SIZE = 1;

    static BASE_CONFIG = {
        editMode: false,
        searchEnabled: true,
        systems: null
    };

    NxSystem: NxSystem;

    get systemsToShow() {
        return Object.entries(this.card.config.systems || {}).map(([key, { show }]: [string, any]) => show ?? true ? key : null).filter(val => val);
    }

    updateSystems(availableSystems: NxSystemInfo[]): void {
        for (const systemId in this.card.config.systems) {
            this.card.config.systems[systemId].available = false;
        }

        this.card.config.systems = availableSystems.reduce((systems, { id, name }) => {
            systems[id] = { name, show: systems?.[id]?.show ?? true, available: true };
            return systems;
        }, this.card.config.systems || {});
    }

    constructor(cd: ChangeDetectorRef) {
        super(cd);
    }
}

NxSystemsListWidgetComponent.registerWidget();
