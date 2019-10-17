import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxHealthService {
    manifestSubject = new BehaviorSubject(undefined);
    valuesSubject = new BehaviorSubject(undefined);
    alarmsSubject = new BehaviorSubject(undefined);

    tableHeaders: any;
    panelParams: any;

    ready: boolean;

    constructor() {}

    get manifest() {
        return this.manifestSubject.getValue();
    }

    set manifest(system) {
        this.manifestSubject.next(system);
    }

    get values() {
        return this.valuesSubject.getValue();
    }

    set values(system) {
        this.valuesSubject.next(system);
    }

    get alarms() {
        return this.alarmsSubject.getValue();
    }

    set alarms(system) {
        this.alarmsSubject.next(system);
    }
}
