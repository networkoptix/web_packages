import { Injectable }  from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class NxSearchService {
    constructor(
    ) {

    }

    static findMatch(searchFor, model) {
        if (model.queryExactMatch) {

        }

        if (model.queryEndsWith) {

        }

        if (model.queryStartsWith) {

        }

        if (model.queryOrMatch) {

        }

        if (model.queryAndMatch) {
            return model.queryAndMatch.every(queryTerm => {
                return (searchFor && searchFor.toLowerCase().includes(queryTerm));
            });
        }

        return false;
    }

    static getMatchPatterns(model) {
        model.queryExactMatch = '';
        model.queryEndsWith = '';
        model.queryStartsWith = '';
        model.queryOrMatch = '';
        model.queryAndMatch = '';

        // "EXACT" match
        let match = model.query.match(/"(.+?)"/g);
        if (match && match[0]) {
            model.queryExactMatch = match[0];
            return;
        }

        // "WILDCARD" match
        if (model.query.indexOf('*') === 0) {
            model.queryEndsWith = model.query.substring(1);
            return;
        }

        if (model.query.indexOf('*') === model.query.length - 1) {
            model.queryStartsWith = model.query.slice(0, -1);
            return;
        }

        // "OR" match
        if (model.query.indexOf('|') > 0) { // not starting with pipe
            match = model.query.match(/([\w-]+)/g);
            model.queryOrMatch = match || '';
            return;
        }

        // "AND" match (default)
        match = model.query
            .trim()
            .replace(/\+/g, ' ')
            .split(/[\s,]/g)
            .filter((elm) => {
                return elm !== '';
            });
        model.queryAndMatch = match;
    }
}
