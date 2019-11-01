import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NxUtilsService } from '../../services/utils.service';
import { NxConfigService } from '../../services/nx-config';

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

    alertsValues: any;
    alertsCount = {
        warning: 0,
        error: 0
    };

    ready: boolean;

    CONFIG: any;

    constructor(private utilsService: NxUtilsService,
                private configService: NxConfigService) {
        this.CONFIG = this.configService.getConfig();
    }

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

    formatValue(header, value) {
        if (header.format) {
            const format = header.format;
            const valueFormats = this.CONFIG.healthMonitoring.valueFormats;
            if (valueFormats[format]) {
                return `${(value * valueFormats[format].multiplier).toFixed(valueFormats[format].decimals)} ${format.display || format}`;
            } else if (format === 'durationS') {
                return this.utilsService.secondsToTime(value);
            } else {
                console.error(`Format not recognized: ${format}`);
                return `${value} ${format}`;
            }
        }
        return value;
    }
}
