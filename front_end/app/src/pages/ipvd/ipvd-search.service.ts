import { Injectable }     from '@angular/core';
import { Observable, of } from 'rxjs';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/switchMap';

@Injectable({
    providedIn: 'root'
})
export class IpvdSearchService {

    private static RESOLUTION = 'resolution';
    private static VENDORS = 'vendors';
    private static TYPES = 'hardwareTypes';
    private static ANALYTICS = 'analytics';

    private _vendors: any;

    constructor() {
        this._vendors = [];
    }

    public get vendors(): any {
        return this._vendors;
    }

    public set vendors(list: any) {
        this._vendors = list;
    }

    ipvdSearch(camerasData, filter) {
        const query = filter.query.toLowerCase();
        const queryTerms = query.trim().split(' ');
        const preferredVendors = '';

        function filterCamera(c, query) {
            function lowerNoDashes(str) {
                return str.replace(/-/g, '').toLowerCase();
            }

            const queryLowerNoDashes = lowerNoDashes(query);

            return (query.length === 0
                    || lowerNoDashes(c.vendor).includes(queryLowerNoDashes)
                    || lowerNoDashes(c.model).includes(queryLowerNoDashes)
                    || c.maxResolution.includes(query));
        }

        let resolution;
        let vendors;
        let types;
        let events;

        if (filter.selects.find(x => x.id === IpvdSearchService.RESOLUTION) !== undefined) {
            resolution = filter.selects.find(x => x.id === IpvdSearchService.RESOLUTION).selected;
        }

        if (filter.multiselects.find(x => x.id === IpvdSearchService.VENDORS) !== undefined) {
            vendors = filter.multiselects.find(x => x.id === IpvdSearchService.VENDORS).selected;
        }

        if (filter.multiselects.find(x => x.id === IpvdSearchService.TYPES) !== undefined) {
            const hardwareType = filter.multiselects.find(x => x.id === IpvdSearchService.TYPES);
            if (hardwareType.selected.length) {
                types = hardwareType.items.filter(x => !hardwareType.selected.includes(x.id));
            }
        }

        if (filter.multiselects.find(x => x.id === IpvdSearchService.ANALYTICS) !== undefined) {
            const analyticsEvents = filter.multiselects.find(x => x.id === IpvdSearchService.ANALYTICS);
            if (analyticsEvents.selected.length) {
                events = analyticsEvents.items.filter(x => {
                    return analyticsEvents.selected.includes(x.id);
                });
            }
        }

        const cameras = camerasData.filter(camera => {
            if (filter.tags.some(key => {
                return key.value === true && camera[key.id] !== true;
            })) {
                return false;
            }

            if (resolution && resolution.value !== '0' && camera.resolutionArea <= resolution.value * 0.9) {
                return false;
            }

            if (vendors && vendors.length > 0 && vendors.indexOf(camera.vendor) === -1) {
                return false;
            }

            if (types &&
                types.length > 0 &&
                types.find(type => type.id === camera.hardwareTypeId)) {

                return false;
            }

            if (events &&
                    events.length > 0 &&
                    !events.some(event => {
                        return camera.analyticsEvents.indexOf(event.label) >= 0;
                    })) {

                return false;
            }

            // Filter by query
            return queryTerms.every(term => {
                return filterCamera(camera, term);
            });
        }).sort((cameraA: any, cameraB: any) => {
            console.log(cameraA, cameraB)
            if (preferredVendors.indexOf(cameraA.vendor.toLowerCase()) !== -1) {
                return -1;
            }
            if (preferredVendors.indexOf(cameraB.vendor.toLowerCase()) !== -1) {
                return 1;
            }
            return cameraA.sortKey < cameraB.sortKey ? -1 : 1;
        });

        return cameras;
    }
}
