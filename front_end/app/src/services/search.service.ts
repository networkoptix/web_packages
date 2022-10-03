import { Injectable } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { BehaviorSubject, Subject } from 'rxjs';

export enum ButtonArrowType {
    up = 'UP',
    down = 'DOWN',
}

@UntilDestroy({ checkProperties: true })
@Injectable({
    providedIn: 'root'
})
export class NxSearchService {
    navDirectionSubject = new BehaviorSubject('');
    navSelectionSubject = new Subject();

    set navDirection(dir: string) {
        this.navDirectionSubject.next(dir);
    }

    get navDirection(): string {
        return this.navDirectionSubject.getValue();
    }

    navSelected() {
        this.navSelectionSubject.next();
    }

    findMatch(searchFor, model) {
        const _searchFor = searchFor && searchFor.toLowerCase();

        if (!_searchFor) {
            return false;
        }

        if (model.queryExactMatch) {
            return model.queryExactMatch.every(queryTerm => {
                return (searchFor.includes(queryTerm)); // case sensitive!
            });
        }

        if (model.queryEndsWith) {
            return (
                _searchFor.indexOf(model.queryEndsWith) ===
                _searchFor.length - model.queryEndsWith[0].length
                // queryEndsWith have only one item
            );
        }

        if (model.queryStartsWith) {
            return (_searchFor.startsWith(model.queryStartsWith));
            // queryStartsWith have only one item
        }

        if (model.queryOrMatch) {
            let isMatch = false;
            model.queryOrMatch.forEach(queryTerm => {
                isMatch = isMatch || (_searchFor.includes(queryTerm));
            });
            return isMatch;
        }

        if (model.queryAndMatch) {
            return model.queryAndMatch.every(queryTerm => {
                return (_searchFor.includes(queryTerm));
            });
        }

        return false;
    }

    getMatchPatterns(model) {
        model.queryExactMatch = '';
        model.queryEndsWith = '';
        model.queryStartsWith = '';
        model.queryOrMatch = '';
        model.queryAndMatch = '';

        // "EXACT" match
        let match = model.query.match(/"(.+?)"/g);
        if (match) {
            model.queryExactMatch = match.map((searchTerm) => searchTerm.replace(/"/g, ''));
            return;
        }

        // "WILDCARD" match
        if (model.query.startsWith('*')) {
            model.queryEndsWith = [model.query.substring(1).toLowerCase()];
            return;
        }

        if (model.query.indexOf('*') === model.query.length - 1) {
            model.queryStartsWith = [model.query.slice(0, -1).toLowerCase()];
            return;
        }

        // "OR" match
        if (model.query.indexOf('|') > 0) { // not starting with pipe
            match = model.query
                .toLowerCase()
                .match(/([\w-]+)/g);

            model.queryOrMatch = match || '';
            return;
        }

        // "AND" match (default)
        match = model.query
            .trim()
            .toLowerCase()
            .replace(/\+/g, ' ')
            .split(/[\s,+]/g)
            .filter((elm) => {
                return elm !== '';
            });
        // if match is empty (i.e query is ",") there is nothing to filter by and will show all entries
        if (!match.length) {
            match.push(','); // add non-searchable char so 'Nothing found' will appear
        }
        model.queryAndMatch = match;
    }
}
