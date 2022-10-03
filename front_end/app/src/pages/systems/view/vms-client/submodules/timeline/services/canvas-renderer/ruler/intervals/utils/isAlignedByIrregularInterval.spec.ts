import IrregularLengthInterval from '../IrregularLengthInterval';

import alignTimeStamp from './alignTimeStamp';
import isAlignedByIrregularInterval from './isAlignedByIrregularInterval';

xdescribe('isAlignedByIrregularInterval', () => {
    const t = 1594225376896; // "Wed Jul 08 2020 19:23:03 GMT+0300 (Moscow Standard Time"

    it('checks regular interval alignments correctly', () => {
        expect(isAlignedByIrregularInterval(1234, 1)).toBeTrue();
        expect(isAlignedByIrregularInterval(1234, 2)).toBeTrue();
        expect(isAlignedByIrregularInterval(1234, 4)).toBeFalse();
        expect(isAlignedByIrregularInterval(1234, 5)).toBeFalse();

        const regularIntervals = [
            500, 1000, 5000, 10000, 30000, 60000, 300000, 600000, 1800000,
            3600000, 3 * 3600000, 6 * 3600000, 12 * 3600000, 24 * 3600000,
            7 * 24 * 3600000
        ];
        regularIntervals.map(i => {
            const l = alignTimeStamp(t, i);
            const r = alignTimeStamp(t, i, 'right');
            expect(isAlignedByIrregularInterval(t, i)).toBeFalse();
            expect(isAlignedByIrregularInterval(l, i)).toBeTrue();
            expect(isAlignedByIrregularInterval(r, i)).toBeTrue();
        });
    });

    it('checks irregular interval alignments correctly', () => {
        const irregularIntervals:Array<IrregularLengthInterval> = [
            'month', 'quarter-year', 'half-year', 'year', 'decade', 'century', 'millenia'
        ];
        irregularIntervals.map(i => {
            const l = alignTimeStamp(t, i);
            const r = alignTimeStamp(t, i, 'right');
            expect(isAlignedByIrregularInterval(t, i)).toBeFalse();
            expect(isAlignedByIrregularInterval(l, i)).toBeTrue();
            expect(isAlignedByIrregularInterval(r, i)).toBeTrue();
        });
    });
});
