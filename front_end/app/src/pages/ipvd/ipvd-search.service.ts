import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class IpvdSearchService {
    private static RESOLUTION = 'resolution';
    private static VENDORS = 'vendors';
    private static TYPES = 'hardwareTypes';
    private static ANALYTICS = 'analytics';

    private _vendors;
    private _showAnalytics;

    constructor() {
        this._vendors = [];
    }

    set showAnalytics(show: boolean) {
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
            if (query.includes('-')) {
                // If dash in query -> perform exact match
                result = (
                    c.vendor.toLowerCase().includes(query) ||
                    c.model.toLowerCase().includes(query)
                );
            } else {
                // If no dash in query -> include results with and without dash
                const queryLowerNoDashes = lowerNoDashes(query);
                result = lowerNoDashes(c.vendor).includes(queryLowerNoDashes);
                result = result || lowerNoDashes(c.model).includes(queryLowerNoDashes);

                result = result || c.analyticsEvents.find((event) => {
                    return event.toLowerCase().includes(queryLowerNoDashes);
                });
            }

            return (query.length === 0 || result || c.maxResolution.includes(query));
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

            if (
                resolution &&
                resolution.value !== '0' &&
                camera.resolutionArea <= resolution.value * 0.9
            ) {
                return false;
            }

            if (
                vendors &&
                vendors.length > 0 &&
                !vendors.includes(camera.vendor)
            ) {
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
                    return camera.analyticsEvents.includes(event.label);
                })) {
                return false;
            }

            if (this._showAnalytics && query.length) {
                const matches = camera.analyticsEvents.filter(analytic =>
                    analytic.toLowerCase().includes(query)
                );
                if (matches.length) {
                    return true;
                }
            }

            // Filter by query
            return queryTerms.length
                ? queryTerms.every(term => filterCamera(camera, term))
                : true;
        }).sort((cameraA: any, cameraB: any) => {
            if (preferredVendors.includes(cameraA.vendor.toLowerCase())) {
                return -1;
            }
            if (preferredVendors.includes(cameraB.vendor.toLowerCase())) {
                return 1;
            }
            return cameraA.sortKey < cameraB.sortKey ? -1 : 1;
        });
    }
}
