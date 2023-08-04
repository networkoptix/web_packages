import { IrregularLengthInterval } from '../IrregularLengthInterval';

import { alignTimeStamp } from './alignTimeStamp';
import { isAlignedByIrregularInterval } from './isAlignedByIrregularInterval';

describe('isAlignedByIrregularInterval', () => {
    const t = 1594225376896; // "Wed Jul 08 2020 19:23:03 GMT+0300 (Moscow Standard Time"

    it('checks regular interval alignments correctly', () => {
        expect(isAlignedByIrregularInterval(1234, 1)).toBeTruthy();
        expect(isAlignedByIrregularInterval(1234, 2)).toBeTruthy();
        expect(isAlignedByIrregularInterval(1234, 4)).toBeFalsy();
        expect(isAlignedByIrregularInterval(1234, 5)).toBeFalsy();

        const regularIntervals = [
            500,
            1000,
            5000,
            10000,
            30000,
            60000,
            300000,
            600000,
            1800000,
            3600000,
            3 * 3600000,
            6 * 3600000,
            12 * 3600000,
            24 * 3600000,
            7 * 24 * 3600000,
        ];
        regularIntervals.forEach(i => {
            const l = alignTimeStamp(t, i);
            const r = alignTimeStamp(t, i, 'right');
            expect(isAlignedByIrregularInterval(t, i)).toBeFalsy();
            expect(isAlignedByIrregularInterval(l, i)).toBeTruthy();
            expect(isAlignedByIrregularInterval(r, i)).toBeTruthy();
        });
    });

    it('checks irregular interval alignments correctly', () => {
        const irregularIntervals: Array<IrregularLengthInterval> = [
            'month',
            'quarter-year',
            'half-year',
            'year',
            'decade',
            'century',
            'millenia',
        ];
        irregularIntervals.forEach(i => {
            const l = alignTimeStamp(t, i);
            const r = alignTimeStamp(t, i, 'right');
            expect(isAlignedByIrregularInterval(t, i)).toBeFalsy();
            expect(isAlignedByIrregularInterval(l, i)).toBeTruthy();
            expect(isAlignedByIrregularInterval(r, i)).toBeTruthy();
        });
    });
});
