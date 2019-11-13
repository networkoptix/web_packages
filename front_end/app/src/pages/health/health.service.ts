import { Injectable }                      from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { NxUtilsService }                  from '../../services/utils.service';
import { NxConfigService }                 from '../../services/nx-config';

@Injectable({
    providedIn: 'root'
})
export class NxHealthService {
    private static ALERTS = 'alertType';
    private static TYPES = 'deviceType';
    private static SERVERS = 'server';

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

    resourceNames = {};

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
        let retValue = value;
        if (header.format) {
            const format = header.format;
            const valueFormats = this.CONFIG.healthMonitoring.valueFormats;
            if (valueFormats[format]) {
                retValue =  `${(value * valueFormats[format].multiplier).toFixed(valueFormats[format].decimals)} ${format.display || format}`;
            } else if (format === 'durationS') {
                retValue = this.utilsService.secondsToTime(value);
            } else if (format === 'resource') {
                retValue = this.resourceNames[value] || value;
            } else if (format === 'thumbnail') {
                retValue = this.resourceNames[value] || value;
            } else {
                console.error(`Format not recognized: ${format}`);
                retValue = `${value} ${format}`;
            }
        }
        return {text: retValue, format: header.format || ''};
    }

    itemsSearch(values, filter) {
        let items: any = {};

        function filterItem(c, queryTerm) {
            return (c.searchTags.includes(queryTerm));
        }

        if (filter.query === '') {
            items = values;
        } else {
            const query = filter.query.toLowerCase();
            const queryTerms = query.trim()
                                    .split(/[\s,\|]+/)
                                    .filter((elm) => {
                                        return elm !== '';
                                    })
                                    .map(term => {
                                        return term.replace(/-/g, '').toLowerCase();
                                    });

            Object.entries(values).forEach(([metric, value]) => {
                queryTerms.every(queryTerm => {
                    if (filterItem(value, queryTerm)) {
                        items[metric] = value;
                    }
                });
            });
        }

        return items;
    }

    alertsSearch(values, filter) {
        let alarms;
        let types;
        let servers;

        const typeAlert = filter.selects && filter.selects.find(x => x.id === NxHealthService.ALERTS);
        if (typeAlert !== undefined) {
            alarms = typeAlert.selected;
        }

        const typeTypes = filter.selects && filter.selects.find(x => x.id === NxHealthService.TYPES);
        if (typeTypes !== undefined) {
            types = typeTypes.selected;
        }

        const typeServers = filter.selects && filter.selects.find(x => x.id === NxHealthService.SERVERS);
        if (typeServers !== undefined) {
            servers = typeServers.selected;
        }

        const alerts = values.filter(alert => {
            if (servers && servers.value !== '0' && alert._.server.id !== servers.value) {
                return false;
            }

            if (types && types.value !== '0' && alert._.type.text !== types.value) {
                return false;
            }

            if (alarms && alarms.value !== '0' && alert._.alarm.icon !== alarms.value) {
                return false;
            }

            return true;
        });

        return alerts;
    }
}
