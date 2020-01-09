import {
    Component,
    Input, SimpleChanges
}                       from '@angular/core';
import { BaseDropdown } from '../injDropdown';

@Component({
    selector: 'nx-systems',
    templateUrl: 'systems.component.html',
    styleUrls: ['systems.component.scss']
})

export class NxSystemsDropdown extends BaseDropdown {
    @Input() endpoint: any;
    @Input() systems: any;
    @Input() activeSystem: any;

    systemCounter: number;
    active = {
        health: false,
        register: false,
        settings: false,
        view: false,
    };
    params: any;

    getUrlFor(sid) {
        let url = '/systems/' + sid;

        if (this.endpoint.view) {
            url += '/view';
        }

        if (this.endpoint.information) {
            url += '/health/';
        }

        return url;
    }


    ngOnInit(): void {
        this.systemCounter = this.systems.length;
    }

    ngOnChanges(changes: SimpleChanges) {
        this.endpoint = (changes.endpoint) ? changes.endpoint.currentValue : this.endpoint;
        this.systems = (changes.systems) ? changes.systems.currentValue : this.systems;
        this.activeSystem = (changes.activeSystem) ? changes.activeSystem.currentValue : this.activeSystem;
        this.systemCounter = this.systems.length;
    }
}
