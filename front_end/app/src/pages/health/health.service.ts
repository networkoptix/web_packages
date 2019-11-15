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
        function roundInt(val) {
            if (typeof val === 'number') {
                if (Math.abs(val) >= 10) {
                    return Math.round(val);
                } else {
                    return parseFloat(val.toFixed(2));
                }
            }
            return val;
        }

        let retValue = value;
        let formatDisplay = header.format || '';
        if (header.format) {
            const format = header.format;
            const valueFormats = this.CONFIG.healthMonitoring.valueFormats;
            if (valueFormats[format]) {
                retValue = roundInt(retValue * valueFormats[format].multiplier);
                formatDisplay = valueFormats[format].display || header.format;
                retValue = `${retValue} ${formatDisplay}`;
            } else if (format === 'durationS') {
                retValue = this.utilsService.secondsToTime(retValue);
            } else if (format === 'resource') {
                retValue = this.resourceNames[retValue] || retValue;
            } else if (format === 'thumbnail') {
                retValue = this.resourceNames[retValue] || retValue;
            } else {
                console.error(`Format not recognized: ${format}`);
                retValue = roundInt(retValue);
                retValue = `${retValue} ${format}`;
            }
        } else {
            retValue = roundInt(retValue);
        }

        return {text: retValue, format: header.format || '', value};
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

    findEntityName(entity) {
        if (entity._ && entity._.name) {
            return entity._.name.text;
        } else if (entity.info && entity.info.name) {
            return entity.info.name.text;
        } else {
            return '–';
        }
    }
}
