import { IrregularLengthInterval } from '../IrregularLengthInterval';
import { ROUGH_YEAR, ROUGH_MONTH } from '../regularLengthIntervals';

export const estimateIrregularLengthIntervalPessimistically = (
    i: IrregularLengthInterval,
): number => {
    switch (i) {
        case 'millenia':
            return 1000 * ROUGH_YEAR;
        case 'century':
            return 100 * ROUGH_YEAR;
        case 'decade':
            return 10 * ROUGH_YEAR;
        case 'year':
            return ROUGH_YEAR;
        case 'half-year':
            return 6 * ROUGH_MONTH;
        case 'quarter-year':
            return 3 * ROUGH_MONTH;
        case 'month':
            return ROUGH_MONTH;
        default:
            return i;
    }
};
