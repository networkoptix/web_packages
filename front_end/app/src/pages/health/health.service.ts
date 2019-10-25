import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxHealthService {
    manifestSubject = new BehaviorSubject(undefined);
    valuesSubject = new BehaviorSubject(undefined);
    alarmsSubject = new BehaviorSubject(undefined);
    systemSubject = new BehaviorSubject(undefined);

    tableHeaders: any;
    panelParams: any;

    ready: boolean;

    constructor() {}

    get manifest() {
        return this.manifestSubject.getValue();
    }

    set manifest(manifest) {
        this.manifestSubject.next(manifest);
    }

    get values() {
        return this.valuesSubject.getValue();
    }

    set values(values) {
        this.valuesSubject.next(values);
    }

    get alarms() {
        return this.alarmsSubject.getValue();
    }

    set alarms(alarms) {
        this.alarmsSubject.next(alarms);
    }

    get system() {
        return this.systemSubject.getValue();
    }

    set system(system) {
        this.systemSubject.next(system);
    }
}
