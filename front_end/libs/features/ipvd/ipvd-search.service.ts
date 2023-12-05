import { Injectable } from '@angular/core';

import type { MultiSelectItem } from '@components/dropdowns/multi-select/multi-select.component.types';
import type { SearchFilter } from '@components/search/search.component.types';
import type { Cameras } from '@services/nx-cloud-api/nx-cloud-api.types';
import { alphabeticalSort } from '@utils/general';

@Injectable({
    providedIn: 'root',
})
export class IpvdSearchService {
    private static RESOLUTION = 'resolution';
    private static VENDORS = 'vendors';
    private static TYPES = 'hardwareTypes';
    private static ANALYTICS = 'analytics';

    private _showAnalytics: boolean;

    set showAnalytics(show: boolean) {
        this._showAnalytics = show;
    }

    ipvdSearch(camerasData: Cameras[], filter: SearchFilter): Cameras[] {
        const query = filter.query.toLowerCase();
        const queryTerms = query
            .trim()
            .split(/[\s\+]+/)
            .filter(elm => elm !== '');

        function filterCamera(c: Cameras, query: string): boolean {
            function lowerNoDashes(str: string): string {
                return str.replace(/-/g, '').toLowerCase();
            }

            let result: boolean;
            if (query.includes('-')) {
                // If dash in query -> perform exact match
                result =
                    c.vendor.toLowerCase().includes(query) || c.model.toLowerCase().includes(query);
            } else {
                // If no dash in query -> include results with and without dash
                const queryLowerNoDashes = lowerNoDashes(query);
                result =
                    lowerNoDashes(c.vendor).includes(queryLowerNoDashes) ||
                    lowerNoDashes(c.model).includes(queryLowerNoDashes) ||
                    !!c.analyticsEvents.find(event =>
                        event.toLowerCase().includes(queryLowerNoDashes),
                    );
            }

            return query.length === 0 || result || c.maxResolution.includes(query);
        }

        const resolution = filter.selects.find(
            x => x.id === IpvdSearchService.RESOLUTION,
        )?.selected;

        const vendors = filter.multiselects.find(x => x.id === IpvdSearchService.VENDORS)?.selected;

        let types: MultiSelectItem[];
        const hardwareType = filter.multiselects.find(x => x.id === IpvdSearchService.TYPES);
        if (hardwareType?.selected.length) {
            types = hardwareType.items.filter(x => !hardwareType.selected.includes(x.id));
        }

        let events: MultiSelectItem[];
        const analyticsEvents = filter.multiselects.find(x => x.id === IpvdSearchService.ANALYTICS);
        if (analyticsEvents?.selected.length) {
            events = analyticsEvents.items.filter(x => analyticsEvents.selected.includes(x.id));
        }

        return camerasData
            .filter(camera => {
                camera.id = camera.sortKey;

                if (filter.tags.some(key => key.value && !camera[key.id])) {
                    return false;
                }

                if (
                    resolution &&
                    resolution.value !== '0' &&
                    camera.resolutionArea <= Number(resolution.value) * 0.9
                ) {
                    return false;
                }

                if (vendors && vendors.length > 0 && !vendors.includes(camera.vendor)) {
                    return false;
                }

                if (
                    types &&
                    types.length > 0 &&
                    types.find(type => type.id === camera.hardwareTypeId)
                ) {
                    return false;
                }

                if (
                    events &&
                    events.length > 0 &&
                    !events.some(event => {
                        return camera.analyticsEvents.includes(event.label);
                    })
                ) {
                    return false;
                }

                if (this._showAnalytics && query.length) {
                    const matches = camera.analyticsEvents.filter(analytic =>
                        analytic.toLowerCase().includes(query),
                    );
                    if (matches.length) {
                        return true;
                    }
                }

                // Filter by query
                return queryTerms.length
                    ? queryTerms.every(term => filterCamera(camera, term))
                    : true;
            })
            .sort(alphabeticalSort(cam => cam.id));
    }
}
