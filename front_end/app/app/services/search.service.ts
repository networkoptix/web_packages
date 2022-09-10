import { Injectable } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { BehaviorSubject, Subject } from 'rxjs';

import type { ButtonArrowType, SearchModel } from './search.service.types';

@UntilDestroy({ checkProperties: true })
@Injectable({
    providedIn: 'root'
})
export class NxSearchService {
    navDirectionSubject = new BehaviorSubject<ButtonArrowType>(null);
    navSelectionSubject = new Subject<void>();

    set navDirection(dir: ButtonArrowType) {
        this.navDirectionSubject.next(dir);
    }

    get navDirection(): ButtonArrowType {
        return this.navDirectionSubject.getValue();
    }

    navSelected(): void {
        this.navSelectionSubject.next();
    }

    findMatch(searchFor: string, model: SearchModel): boolean {
        if (!searchFor) {
            return false;
        }

        if (model.queryExactMatch) {
            return model.queryExactMatch.every(queryTerm =>
                searchFor.includes(queryTerm)
                // case sensitive!
            );
        }

        const searchForLower = searchFor.toLowerCase();

        if (model.queryEndsWith) {
            return searchForLower.endsWith(model.queryEndsWith[0]);
        }

        if (model.queryStartsWith) {
            return searchForLower.startsWith(model.queryStartsWith[0]);
        }

        if (model.queryOrMatch) {
            return model.queryOrMatch.some(queryTerm =>
                searchForLower.includes(queryTerm)
            );
        }

        if (model.queryAndMatch) {
            return model.queryAndMatch.every(queryTerm =>
                searchForLower.includes(queryTerm)
            );
        }

        return false;
    }

    /* At least one of the query match properties will be converted to string[] */
    getMatchPatterns(model: SearchModel): void {
        model.queryExactMatch = '';
        model.queryEndsWith = '';
        model.queryStartsWith = '';
        model.queryOrMatch = '';
        model.queryAndMatch = '';

        // "EXACT" match
        const exactMatch = model.query.match(/"(.+?)"/g);
        if (exactMatch) {
            model.queryExactMatch = exactMatch.map(searchTerm =>
                searchTerm.replace(/"/g, '')
            );
            return;
        }

        // "WILDCARD" match
        if (model.query.startsWith('*')) {
            model.queryEndsWith = [model.query.substring(1).toLowerCase()];
            return;
        }

        if (model.query.endsWith('*')) {
            model.queryStartsWith = [model.query.slice(0, -1).toLowerCase()];
            return;
        }

        // "OR" match
        if (model.query.indexOf('|') > 0) { // not starting with pipe
            const orMatch = model.query.toLowerCase().match(/([\w-]+)/g);
            model.queryOrMatch = orMatch || '';
            return;
        }

        // "AND" match (default)
        const andMatch = model.query
            .trim()
            .toLowerCase()
            .replace(/\+/g, ' ')
            .split(/[\s,+]/g)
            .filter(elm => elm !== '');
        // if match is empty (i.e query is ",") there is nothing to filter by and will show all entries
        if (!andMatch.length) {
            andMatch.push(','); // add non-searchable char so 'Nothing found' will appear
        }
        model.queryAndMatch = andMatch;
    }
}
