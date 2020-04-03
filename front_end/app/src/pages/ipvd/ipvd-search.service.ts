import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class IpvdSearchService {
    private static RESOLUTION = 'resolution';
    private static VENDORS = 'vendors';
    private static TYPES = 'hardwareTypes';
    private static ANALYTICS = 'analytics';

    private _vendors: any;
    private _showAnalytics: any;

    constructor() {
        this._vendors = [];
    }

    set showAnalytics(show: boolean){
        this._showAnalytics = show;
    }

    public get vendors(): any {
        return this._vendors;
    }

    public set vendors(list: any) {
        this._vendors = list;
    }

    ipvdSearch(camerasData, filter) {
        const query = filter.query.toLowerCase();
        const queryTerms = query.trim()
            .split(/[\s\+]+/)
            .filter(elm => elm !== '');
        const preferredVendors = '';

        function filterCamera(c, query) {
            function lowerNoDashes(str) {
                return str.replace(/-/g, '').toLowerCase();
            }

            let result;
            if (query.indexOf('-') > -1) {
                // If dash in query -> perform exact match
                result = (c.vendor.toLowerCase().indexOf(query) > -1 ||
                    c.model.toLowerCase().indexOf(query) > -1);
            } else {
                // If no dash in query -> include results with and without dash
                const queryLowerNoDashes = lowerNoDashes(query);
                result = (lowerNoDashes(c.vendor).indexOf(queryLowerNoDashes) > -1 ||
                    lowerNoDashes(c.model).indexOf(queryLowerNoDashes) > -1);
            }

            return (query.length === 0 || result || c.maxResolution.indexOf(query) > -1);
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

        return camerasData.filter(camera => {
            if (filter.tags.some(key => {
                return key.value && !camera[key.id];
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

            if (this._showAnalytics && query.length) {
                const matches = camera.analyticsEvents.filter(analytic => analytic.toLowerCase().includes(query));
                return matches.length;
            }

            // Filter by query
            return queryTerms.length
                ? queryTerms.every(term => filterCamera(camera, term))
                : true;
        }).sort((cameraA: any, cameraB: any) => {
            if (preferredVendors.indexOf(cameraA.vendor.toLowerCase()) !== -1) {
                return -1;
            }
            if (preferredVendors.indexOf(cameraB.vendor.toLowerCase()) !== -1) {
                return 1;
            }
            return cameraA.sortKey < cameraB.sortKey ? -1 : 1;
        });
    }
}
