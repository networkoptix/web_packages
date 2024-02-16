import { shuffle } from 'lodash-es';

import { sortByName } from './sort-by-name';

describe('sortByName', () => {
    it('should sort by name', () => {
        const sorted = [
            { name: 'a' },
            { name: 'b' },
            { name: 'c' },
            { name: 'ca' },
            { name: 'cb' },
        ];
        const unsorted = shuffle(sorted);
        expect(unsorted.sort(sortByName)).toEqual(sorted);
    });
});
