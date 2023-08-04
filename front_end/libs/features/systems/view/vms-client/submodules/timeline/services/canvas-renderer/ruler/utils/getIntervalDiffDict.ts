import { IrregularLengthInterval } from '../intervals/IrregularLengthInterval';

export function getWeightArrayFromIntervalList(arr: Array<any>) {
    return arr.reduce((acc, v, k) => {
        acc[v] = k + 1;
        return acc;
    }, {});
}

export function getIntervalDiffDict(
    a1: Array<IrregularLengthInterval>,
    a2: Array<IrregularLengthInterval>,
) {
    const d1 = getWeightArrayFromIntervalList(a1);
    const d2 = getWeightArrayFromIntervalList(a2);
    const result = {};
    Object.keys(d1).forEach(d1k => {
        if (d1[d1k] !== d2[d1k]) {
            result[d1k] = [d1[d1k], d2[d1k] || 0];
        } else {
            result[d1k] = d1[d1k];
        }
    });
    Object.keys(d2)
        .filter(d2k => !(d2k in result))
        .forEach(d2k => {
            result[d2k] = [0, d2[d2k]];
        });
    return result;
}
