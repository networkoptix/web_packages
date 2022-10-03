import IrregularLengthInterval from '../IrregularLengthInterval';

import alignTimeStamp from './alignTimeStamp';

xdescribe('alignTimeStamp', () => {
    const t = 1594225376896; // "Wed Jul 08 2020 19:23:03 GMT+0300 (Moscow Standard Time"

    it('alignes regular intervals correctly', () => {
        expect(alignTimeStamp(1234, 100)).toEqual(1200);
        expect(alignTimeStamp(1234, 100, 'right')).toEqual(1300);
        expect(alignTimeStamp(1234, 1000)).toEqual(1000);
        expect(alignTimeStamp(1234, 1000, 'right')).toEqual(2000);

        const regularIntervals = [
            500, 1000, 5000, 10000, 30000, 60000, 300000, 600000, 1800000,
            3600000, 3 * 3600000, 6 * 3600000, 12 * 3600000, 24 * 3600000,
            7 * 24 * 3600000
        ];
        regularIntervals.map(i => {
            const l = alignTimeStamp(t, i);
            const r = alignTimeStamp(t, i, 'right');
            expect(l % i).toEqual(0);
            expect(r % i).toEqual(0);
            expect(r - l).toEqual(i);
        });

        expect(new Date(alignTimeStamp(t, 1000)).getMilliseconds()).toEqual(0);
        expect(new Date(alignTimeStamp(t, 1000, 'right')).getMilliseconds()).toEqual(0);

        expect(new Date(alignTimeStamp(t, 60 * 1000)).getSeconds()).toEqual(0);
        expect(new Date(alignTimeStamp(t, 60 * 1000, 'right')).getSeconds()).toEqual(0);

        expect(new Date(alignTimeStamp(t, 60 * 60 * 1000)).getMinutes()).toEqual(0);
        expect(new Date(alignTimeStamp(t, 60 * 60 * 1000, 'right')).getMinutes()).toEqual(0);

        expect(new Date(alignTimeStamp(t, 24 * 60 * 60 * 1000)).getHours())
            .toEqual(new Date(t).getTimezoneOffset() / -60);
        expect(new Date(alignTimeStamp(t, 24 * 60 * 60 * 1000, 'right')).getHours())
            .toEqual(new Date(t).getTimezoneOffset() / -60);
    });

    it('aligns irregular intervals correctly', () => {
        function check (i: IrregularLengthInterval, d: 'left' | 'right' = 'left') {
            const r = alignTimeStamp(t, i, d);
            const v = new Date(r);
            switch (i) {
                case 'millenia': {
                    expect(v.getFullYear() % 1000).toEqual(0);
                    break;
                }
                case 'century': {
                    expect(v.getFullYear() % 100).toEqual(0);
                    break;
                }
                case 'decade': {
                    expect(v.getFullYear() % 10).toEqual(0);
                    break;
                }
                case 'year': {
                    expect(v.getMonth()).toEqual(0);
                    break;
                }
                case 'half-year': {
                    expect(v.getMonth() % 6).toEqual(0);
                    break;
                }
                case 'quarter-year': {
                    expect(v.getMonth() % 3).toEqual(0);
                    break;
                }
                case 'month': {
                    expect(v.getDate()).toEqual(1);
                    expect(v.getHours()).toEqual(0);
                    expect(v.getMinutes()).toEqual(0);
                    expect(v.getSeconds()).toEqual(0);
                    expect(v.getMilliseconds()).toEqual(0);
                    break;
                }
            }
            return r;
        }

        const irregularIntervals = [
            'month', 'quarter-year', 'half-year', 'year', 'decade', 'century', 'millenia'
        ];
        const directions = [
            'left', 'right'
        ];
        // @ts-ignore
        irregularIntervals.map((i: IrregularLengthInterval) => {
            directions.map((d: 'left' | 'right') => {
                check(i, d);
            });
        });
    });
});
